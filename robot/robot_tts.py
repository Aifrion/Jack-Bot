"""
Minimal robot client — only handles TTS between game stages.

What it does:
    1. Connects to the JackBot game server via socket.io.
    2. Subscribes to a room as a privileged robot viewer.
    3. On every NEW phase, speaks the server-provided `robotScript` via Piper
       in a background thread. The handler returns immediately so the next
       phase event can be processed without waiting for speech to finish.
    4. If a new phase arrives WHILE the robot is still speaking, the prior
       speech is interrupted and the new phase takes over.
    5. For robot-driven phases (intro / announcement / round_result / game_over),
       emits `phase-done` after speech completes naturally — NOT if it was
       interrupted by a host skip/continue.

What it intentionally does NOT do (vs. robot_client.py):
    - No ROS2 publishing.
    - No print-only fallback — requires Piper TTS to be installed and working.

Requirements:
    - `tts.py` next to this file with:
          def read_text(speech: str, should_stop: Optional[Callable[[], bool]] = None)
      The `should_stop` callback is checked between Piper chunks and aborts
      audio when it returns True. If your tts.py doesn't accept that kwarg
      yet, this script falls back to non-interruptible speech.

Setup:
    pip install "python-socketio[client]" websocket-client sounddevice piper-tts numpy

Run:
    python3 -u robot_tts.py --server https://jack-bot-ixak.onrender.com
"""

import argparse
import sys
import threading
from typing import Optional

import socketio  # type: ignore[import-not-found]

from tts import read_text


ROBOT_DRIVEN_PHASES = {"intro", "announcement", "round_result", "game_over"}


def speak(line: str, should_stop) -> None:
    """Speak a line. Falls back gracefully if tts.read_text doesn't accept
    should_stop (i.e. older non-interruptible tts.py)."""
    try:
        read_text(line, should_stop=should_stop)
    except TypeError:
        read_text(line)


def main() -> int:
    parser = argparse.ArgumentParser(description="TTS-only robot client for JackBot")
    parser.add_argument("--code", default="TEST", help="Room code (default: TEST)")
    parser.add_argument(
        "--server",
        default="http://localhost:8080",
        help="Game server URL (default: http://localhost:8080)",
    )
    args = parser.parse_args()

    sio = socketio.Client(reconnection=True)
    last_phase = {"value": None}
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
                print(f"🤖 SPEAKS: {script}")
                speak(script, cancel.is_set)
            if cancel.is_set():
                print("  (speech interrupted by next phase)")
                return
            if phase in ROBOT_DRIVEN_PHASES and phase != "game_over":
                if last_phase["value"] == phase:
                    print("→ emitting phase-done")
                    sio.emit("phase-done", args.code)

        threading.Thread(target=worker, daemon=True).start()

    @sio.event
    def connect() -> None:
        print(f"[robot] connected to {args.server}")
        sio.emit("robot-subscribe", args.code, callback=on_subscribed)

    def on_subscribed(ack):
        if not ack or not ack.get("ok"):
            print(f"[robot] subscribe failed: {(ack or {}).get('error', 'unknown')}", file=sys.stderr)
            sio.disconnect()
            return
        print(f"[robot] subscribed to room {args.code}")

    @sio.on("robot-state")
    def on_robot_state(state) -> None:
        phase = state["phase"]
        if phase == last_phase["value"]:
            return
        last_phase["value"] = phase

        print(f"\n=== phase: {phase.upper()} ===")
        start_phase_work(state.get("robotScript"), phase)

    @sio.event
    def disconnect() -> None:
        print("[robot] disconnected")

    try:
        sio.connect(args.server)
        sio.wait()
    except KeyboardInterrupt:
        print("\n[robot] shutting down")
        if active_cancel[0] is not None:
            active_cancel[0].set()
        sio.disconnect()
    except Exception as exc:
        print(f"[robot] fatal: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
