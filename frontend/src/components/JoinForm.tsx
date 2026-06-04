import { useState, type FormEvent } from 'react';
import {
  ROOM_CODE_LENGTH,
  MAX_NAME_LENGTH,
  SHIRT_COLORS,
  type JoinPayload,
  type ShirtColor,
} from '../types';

interface JoinFormProps {
  onJoin: (payload: JoinPayload) => void;
}

const INVALID_CODE_CHARS = /[^A-Z0-9]/g;

export function JoinForm({ onJoin }: JoinFormProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [shirtColor, setShirtColor] = useState<ShirtColor | null>(null);

  const trimmedName = playerName.trim();
  const isCodeValid = roomCode.length === ROOM_CODE_LENGTH;
  const isNameValid = trimmedName.length > 0;
  const isColorValid = shirtColor !== null;
  const canSubmit = isCodeValid && isNameValid && isColorValid;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !shirtColor) return;
    onJoin({ roomCode, playerName: trimmedName, shirtColor });
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

      <div className="field">
        <span className="field-label">Shirt color</span>
        <div className="shirt-picker" role="radiogroup" aria-label="Shirt color">
          {SHIRT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={shirtColor === c}
              aria-label={c}
              title={c}
              className={`shirt-swatch${shirtColor === c ? ' shirt-swatch-selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setShirtColor(c)}
            />
          ))}
        </div>
      </div>

      <button className="button" type="submit" disabled={!canSubmit}>
        Join game
      </button>
    </form>
  );
}
