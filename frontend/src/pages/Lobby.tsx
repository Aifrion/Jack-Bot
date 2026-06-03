import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import type { Ack, RoomState } from '../game-types';

interface LocationState {
  playerName?: string;
}

const MIN_PLAYERS_TO_START = 3;

export function Lobby() {
  const { code = '' } = useParams<{ code: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { socket, socketId } = useSocket();
  const playerName = (state as LocationState | null)?.playerName ?? 'Player';

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onRoomState(next: RoomState) {
      setRoomState(next);
    }

    socket.on('room-state', onRoomState);
    socket.emit('join-room', { code, name: playerName }, (ack: Ack) => {
      if (!ack?.ok) setError(ack?.error ?? 'Failed to join room');
    });

    return () => {
      socket.off('room-state', onRoomState);
    };
  }, [socket, code, playerName]);

  useEffect(() => {
    if (roomState && roomState.phase !== 'lobby') {
      navigate(`/play/${code}`, { replace: true });
    }
  }, [roomState?.phase, code, navigate]);

  const players = roomState?.players ?? [];
  const isHost = Boolean(socketId) && socketId === roomState?.hostSocketId;

  function handleStart() {
    socket.emit('start-game', code, (ack: Ack) => {
      if (!ack?.ok) setError(ack?.error ?? 'Failed to start game');
    });
  }

  return (
    <main className="page">
      <div className="card">
        <header className="brand">
          <h1 className="title">LOBBY</h1>
          <p className="tagline">
            Room <strong>{code}</strong> · You're in as <strong>{playerName}</strong>
            {isHost && ' (host)'}
          </p>
        </header>

        {error ? (
          <p className="joined-line error">{error}</p>
        ) : (
          <section className="player-list-wrap">
            <p className="field-label">Players ({players.length})</p>
            {players.length === 0 ? (
              <p className="joined-line muted">Connecting…</p>
            ) : (
              <ul className="player-list">
                {players.map((p) => (
                  <li
                    key={p.socketId}
                    className={`player-chip${p.socketId === roomState?.hostSocketId ? ' player-chip-host' : ''}`}
                  >
                    {p.name}
                    {p.socketId === roomState?.hostSocketId && (
                      <span className="host-badge">host</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isHost ? (
              <>
                <button
                  className="button"
                  type="button"
                  onClick={handleStart}
                  disabled={players.length < MIN_PLAYERS_TO_START}
                >
                  Start game
                </button>
                {players.length < MIN_PLAYERS_TO_START && (
                  <p className="joined-line muted">
                    Need at least {MIN_PLAYERS_TO_START} players to start ({players.length}/{MIN_PLAYERS_TO_START})
                  </p>
                )}
              </>
            ) : (
              <p className="joined-line muted">Waiting for the host to start the game…</p>
            )}
          </section>
        )}

        <button
          className="button button-ghost"
          type="button"
          onClick={() => navigate('/')}
        >
          Leave
        </button>
      </div>
    </main>
  );
}
