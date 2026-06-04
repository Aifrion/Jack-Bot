"""
Piper TTS for the JackBot robot. Authored by teammate.

Loads the Piper voice once at import time and exposes `read_text(speech)`
to synthesize and play through the Pi's speaker. Importing this module
requires:

    pip install sounddevice piper-tts numpy

…and the voice model file `en_GB-semaine-medium.onnx` must sit next to
this file (or wherever the process's CWD is).
"""

from typing import Callable, Optional

import sounddevice as sd
from piper import PiperVoice
from piper import PiperVoice, SynthesisConfig

# Load once at startup, reuse for every call. CPU only on the Pi.
voice = PiperVoice.load("en_GB-semaine-medium.onnx")

syn_config = SynthesisConfig(volume=1.0)  # 1.0 = default, 0.5 = half


import numpy as np

# code for making volume louder
def amplify(int16_bytes: bytes, gain: float) -> bytes:
    samples = np.frombuffer(int16_bytes, dtype=np.int16).astype(np.float32)
    samples *= gain
    np.clip(samples, -32768, 32767, out=samples)
    return samples.astype(np.int16).tobytes()


# creates audio from str speech and plays on pupper's speaker.
# If `should_stop()` returns True between chunks, playback is aborted
# (remaining audio in the OS buffer is discarded, not drained).
def read_text(speech: str, should_stop: Optional[Callable[[], bool]] = None):
    stream = None
    interrupted = False
    try:
        for chunk in voice.synthesize(speech, syn_config=syn_config):
            if should_stop is not None and should_stop():
                interrupted = True
                break
            if stream is None:
                stream = sd.RawOutputStream(
                    samplerate=chunk.sample_rate,
                    channels=chunk.sample_channels,
                    dtype="int16",
                )
                stream.start()
            #stream.write(chunk.audio_int16_bytes)
            stream.write(amplify(chunk.audio_int16_bytes, 4.0))
    finally:
        if stream is not None:
            if interrupted:
                stream.abort()
            else:
                stream.stop()
            stream.close()


if __name__ == '__main__':
    read_text('hi this is piper robot voice CSE yas big yas working good')
    read_text("let's talk louder god dam it")
