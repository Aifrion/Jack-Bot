from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from typing import Any, Callable, Optional

import socketio  # type: ignore[import-not-found]


ROBOT_DRIVEN_PHASES = {"intro", "announcement", "round_result", "game_over"}
ELIMINATION_PHASES = {"round_result", "game_over"}


class FindPersonPublisher:
    """Publishes the eliminated player's name + shirt color to /find_person
    so the navigation node can drive the robot toward them. Falls back to
    print-only logging if rclpy isn't importable (e.g. running on a dev
    laptop without ROS2 sourced)."""

    def __init__(self, topic: str = "find_person") -> None:
        self._rclpy = None
        self._node = None
        self._publisher = None
        self._String = None
        try:
            import rclpy  # type: ignore[import-not-found]
            from rclpy.node import Node  # type: ignore[import-not-found]
            from std_msgs.msg import String  # type: ignore[import-not-found]
        except Exception as exc:  # noqa: BLE001
            print(
                f"[robot] rclpy unavailable ({exc.__class__.__name__}: {exc}); "
                f"find_person messages will be printed only",
                file=sys.stderr,
            )
            return

        rclpy.init()
        self._rclpy = rclpy
        self._String = String
        self._node = Node("jackbot_robot_client")
        self._publisher = self._node.create_publisher(String, topic, 10)
        print(f"[robot] rclpy ready; publishing to /{topic}")

    def publish(self, name: str, color: str) -> None:
        payload = json.dumps({"name": name, "color": color})
        if self._publisher is None or self._String is None:
            print(f"  [find_person] would publish: {payload}")
            return
        msg = self._String()
        msg.data = payload
        self._publisher.publish(msg)
        print(f"  [find_person] published: {payload}")

    def shutdown(self) -> None:
        if self._node is not None:
            self._node.destroy_node()
        if self._rclpy is not None:
            self._rclpy.shutdown()


def build_speak_fn(
    fallback_delay: float,
) -> Callable[[str, Optional[Callable[[], bool]]], None]:
    try:
        from tts import read_text  # type: ignore[import-not-found]
    except Exception as exc:  # noqa: BLE001
        print(
            f"[robot] Piper TTS unavailable ({exc.__class__.__name__}: {exc}); "
            f"using print-only fallback (--speak-delay {fallback_delay}s)",
            file=sys.stderr,
        )

        def speak_print(line: str, should_stop: Optional[Callable[[], bool]] = None) -> None:
            print(f"  🤖 SPEAKS: {line}")
            if fallback_delay <= 0:
                return
            end = time.monotonic() + fallback_delay
            while time.monotonic() < end:
                if should_stop is not None and should_stop():
                    return
                time.sleep(0.05)

        return speak_print

    print("[robot] Piper TTS loaded; speech will be synthesized")

    def speak_tts(line: str, should_stop: Optional[Callable[[], bool]] = None) -> None:
        print(f"  🤖 SPEAKS: {line}")
        try:
            read_text(line, should_stop=should_stop)
        except TypeError:
            # Older tts.py without should_stop kwarg — fall back to non-interruptible.
            read_text(line)

    return speak_tts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Robot client for JackBot")
    parser.add_argument("--code", default="TEST", help="Room code (default: TEST)")
    parser.add_argument(
        "--server",
        default="http://localhost:8080",
        help="Game server URL (default: http://localhost:8080)",
    )
    parser.add_argument(
        "--speak-delay",
        type=float,
        default=2.0,
        help="Seconds to wait in the print-only fallback before phase-done (default: 2)",
    )
    parser.add_argument(
        "--test-elimination",
        action="store_true",
        help=(
            "Test mode: after handshake, immediately publish a fake elimination "
            "to /find_person (name=TestPlayer, color=red). Lets you smoke-test "
            "the ROS2 pub/sub without playing a full game."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    speak = build_speak_fn(args.speak_delay)
    find_person = FindPersonPublisher()

    sio = socketio.Client(reconnection=True)

    last_phase: dict[str, str | None] = {"value": None}
    # Cancel signal for the in-flight speech worker (if any). Replaced each
    # time a new phase arrives so old workers can be told to stop without
    # affecting the new one.
    active_cancel: list[Optional[threading.Event]] = [None]

    def start_phase_work(script: Optional[str], phase: str) -> None:
        prior = active_cancel[0]
        if prior is not None:
            prior.set()
        cancel = threading.Event()
        active_cancel[0] = cancel

        def worker() -> None:
            if script:
                speak(script, cancel.is_set)
            if cancel.is_set():
                return
            if phase in ROBOT_DRIVEN_PHASES and phase != "game_over":
                if last_phase["value"] == phase:
                    print("  → emitting phase-done")
                    sio.emit("phase-done", args.code)

        threading.Thread(target=worker, daemon=True).start()

    @sio.event
    def connect() -> None:
        print(f"[robot] connected to {args.server}")
        sio.emit("robot-subscribe", args.code, callback=on_subscribed)

    def on_subscribed(ack: dict[str, Any] | None) -> None:
        if not ack or not ack.get("ok"):
            err = (ack or {}).get("error", "unknown error")
            print(f"[robot] subscribe failed: {err}", file=sys.stderr)
            sio.disconnect()
            return
        print(f"[robot] subscribed to room {args.code}")
        if args.test_elimination:
            # Small delay so the ROS2 subscriber has time to discover this
            # publisher before the one-shot message goes out.
            print("[robot] test mode: scheduling fake elimination → /find_person (TestPlayer, red)")
            threading.Timer(1.0, lambda: find_person.publish("TestPlayer", "red")).start()

    @sio.on("robot-state")
    def on_robot_state(state: dict[str, Any]) -> None:
        phase = state["phase"]
        if phase == last_phase["value"]:
            return
        last_phase["value"] = phase

        print()
        print(f"=== phase: {phase.upper()}  (round {state.get('currentRound', 0) + 1}) ===")

        spy = state.get("spy")
        if spy:
            print(f"  spy: {spy['name']}")

        q = state.get("currentQuestion")
        if q:
            print(f"  question: {q}")

        for a in state.get("roundAnswers") or []:
            print(f"  - {a['name']}: {a['answer']}")

        le = state.get("lastEliminated")
        if le:
            print(f"  eliminated: {le['name']} (was spy: {le['wasSpy']})")
            if phase in ELIMINATION_PHASES:
                target = next(
                    (p for p in state.get("players", []) if p["socketId"] == le["socketId"]),
                    None,
                )
                color = target["shirtColor"] if target else "unknown"
                find_person.publish(le["name"], color)

        winner = state.get("winner")
        if winner:
            print(f"  WINNER: {winner}")

        start_phase_work(state.get("robotScript"), phase)

    @sio.event
    def disconnect() -> None:
        print("[robot] disconnected")

    @sio.event
    def connect_error(data: Any) -> None:
        print(f"[robot] connect_error: {data}", file=sys.stderr)

    try:
        sio.connect(args.server)
        sio.wait()
    except KeyboardInterrupt:
        print("\n[robot] shutting down")
        if active_cancel[0] is not None:
            active_cancel[0].set()
        sio.disconnect()
    except Exception as exc:  # noqa: BLE001
        print(f"[robot] fatal: {exc}", file=sys.stderr)
        return 1
    finally:
        find_person.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
