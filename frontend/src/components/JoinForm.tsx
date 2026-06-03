import { useState, type FormEvent } from 'react';
import { ROOM_CODE_LENGTH, MAX_NAME_LENGTH, type JoinPayload } from '../types';

interface JoinFormProps {
  onJoin: (payload: JoinPayload) => void;
}

const INVALID_CODE_CHARS = /[^A-Z0-9]/g;

export function JoinForm({ onJoin }: JoinFormProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const trimmedName = playerName.trim();
  const isCodeValid = roomCode.length === ROOM_CODE_LENGTH;
  const isNameValid = trimmedName.length > 0;
  const canSubmit = isCodeValid && isNameValid;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onJoin({ roomCode, playerName: trimmedName });
  }

  return (
    <form className="join-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Room code</span>
        <input
          className="input input-code"
          value={roomCode}
          onChange={(e) =>
            setRoomCode(
              e.target.value
                .toUpperCase()
                .replace(INVALID_CODE_CHARS, '')
                .slice(0, ROOM_CODE_LENGTH),
            )
          }
          placeholder="ABCD"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={ROOM_CODE_LENGTH}
          aria-label="Room code"
        />
      </label>

      <label className="field">
        <span className="field-label">Your name</span>
        <input
          className="input"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, MAX_NAME_LENGTH))}
          placeholder="Robo-Ricky"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          aria-label="Your name"
        />
      </label>

      <button className="button" type="submit" disabled={!canSubmit}>
        Join game
      </button>
    </form>
  );
}
