from __future__ import annotations

import argparse
import sys
import time
from typing import Any, Callable

import socketio  # type: ignore[import-not-found]


ROBOT_DRIVEN_PHASES = {"intro", "announcement", "round_result", "game_over"}


def build_speak_fn(fallback_delay: float) -> Callable[[str], None]:
    try:
        from tts import read_text  # type: ignore[import-not-found]
    except Exception as exc:  # noqa: BLE001
        print(
            f"[robot] Piper TTS unavailable ({exc.__class__.__name__}: {exc}); "
            f"using print-only fallback (--speak-delay {fallback_delay}s)",
            file=sys.stderr,
        )

        def speak_print(line: str) -> None:
            print(f"  🤖 SPEAKS: {line}")
            if fallback_delay > 0:
                time.sleep(fallback_delay)

        return speak_print

    print("[robot] Piper TTS loaded; speech will be synthesized")

    def speak_tts(line: str) -> None:
        print(f"  🤖 SPEAKS: {line}")
        read_text(line)  # blocks until audio finishes

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
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    speak = build_speak_fn(args.speak_delay)

    sio = socketio.Client(reconnection=True)

    # Track the last phase we acted on so we don't react every time a player
    # submits something within the same phase.
    last_phase: dict[str, str | None] = {"value": None}

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

    @sio.on("robot-state")
    def on_robot_state(state: dict[str, Any]) -> None:
        phase = state["phase"]
        if phase == last_phase["value"]:
            return  # intra-phase update, nothing new to say
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

        winner = state.get("winner")
        if winner:
            print(f"  WINNER: {winner}")

        # Speak first (blocks until audio is done in TTS mode), THEN advance.
        # Order matters: phase-done before speaking would let the server
        # transition while the robot is still talking.
        script = state.get("robotScript")
        if script:
            speak(script)

        if phase in ROBOT_DRIVEN_PHASES and phase != "game_over":
            print("  → emitting phase-done")
            sio.emit("phase-done", args.code)

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
        sio.disconnect()
    except Exception as exc:  # noqa: BLE001
        print(f"[robot] fatal: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
