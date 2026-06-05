import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import { useSocket } from '../context/SocketContext';
import type { Ack, RoomState } from '../game-types';

export function Play() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { socket, socketId } = useSocket();

  const [roomState, setRoomState] = useState<RoomState | null>(null);

  useEffect(() => {
    function onRoomState(next: RoomState) {
      setRoomState(next);
    }
    socket.on('room-state', onRoomState);
    socket.emit('request-room-state', code);
    return () => {
      socket.off('room-state', onRoomState);
    };
  }, [socket, code]);

  if (!roomState) {
    return (
      <main className="page">
        <div className="card">
          <p className="joined-line muted">Loading game…</p>
        </div>
      </main>
    );
  }

  const isHost = roomState.hostSocketId === socketId;

  return (
    <main className="page">
      <div className="card">
        <PhaseHeader roomState={roomState} />
        <PhaseBody
          roomState={roomState}
          isHost={isHost}
          socket={socket}
          socketId={socketId}
          code={code}
        />
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

function PhaseHeader({ roomState }: { roomState: RoomState }) {
  const phaseLabel: Record<RoomState['phase'], string> = {
    lobby: 'LOBBY',
    intro: 'INTRO',
    question: 'QUESTION',
    announcement: 'ANNOUNCEMENT',
    defense: 'DEFENSE',
    voting: 'VOTING',
    round_result: 'ROUND RESULT',
    game_over: 'GAME OVER',
  };
  return (
    <header className="brand">
      <h1 className="title">{phaseLabel[roomState.phase]}</h1>
      <p className="tagline">
        Room <strong>{roomState.code}</strong> · Round {roomState.currentRound + 1}
        {roomState.youAreSpy && <span className="spy-badge">you are the spy</span>}
      </p>
    </header>
  );
}

interface PhaseBodyProps {
  roomState: RoomState;
  isHost: boolean;
  socket: Socket;
  socketId: string;
  code: string;
}

function PhaseBody(props: PhaseBodyProps) {
  switch (props.roomState.phase) {
    case 'intro':
      return <RobotSpeechView {...props} />;
    case 'question':
      return <QuestionView {...props} />;
    case 'announcement':
      return <AnnouncementView {...props} />;
    case 'defense':
      return <DefenseView {...props} />;
    case 'voting':
      return <VotingView {...props} />;
    case 'round_result':
      return <RobotSpeechView {...props} />;
    case 'game_over':
      return <GameOverView {...props} />;
    case 'lobby':
      return <p className="joined-line muted">Returning to lobby…</p>;
  }
}

function RobotSpeechView({ roomState, isHost, socket, code }: PhaseBodyProps) {
  function handleContinue() {
    socket.emit('phase-done', code, (ack: Ack) => {
      if (!ack?.ok) console.warn('phase-done rejected:', ack?.error);
    });
  }
  return (
    <section className="phase-body">
      <div className="robot-bubble">
        <p className="robot-label">🤖 robot says</p>
        <p>{roomState.robotScript ?? '…'}</p>
      </div>
      {isHost ? (
        <button className="button" type="button" onClick={handleContinue}>
          Continue
        </button>
      ) : (
        <p className="joined-line muted">Waiting for the host to continue…</p>
      )}
    </section>
  );
}

function QuestionView({ roomState, socket, code }: PhaseBodyProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(n: number) {
    setSelected(n);
    socket.emit('submit-answer', { code, answer: n }, (ack: Ack) => {
      if (!ack?.ok) {
        setError(ack?.error ?? 'Failed to submit');
        setSelected(null);
      }
    });
  }

  const submitted = roomState.yourAnswerSubmitted;
  const aliveCount = roomState.players.filter((p) => p.isAlive).length;
  const answeredCount = roomState.players.filter((p) => p.isAlive && p.hasAnswered).length;

  return (
    <section className="phase-body">
      <div className="prompt">
        {roomState.youAreSpy ? (
          <p className="prompt-text">You're the spy, try to pick a number to blend in!</p>
        ) : (
          <p className="prompt-text">{roomState.currentQuestion ?? '…'}</p>
        )}
      </div>

      <Countdown deadline={roomState.phaseDeadline} />

      <div className="number-picker" aria-disabled={submitted}>
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            className={`number-btn${selected === n || (submitted && selected === n) ? ' number-btn-selected' : ''}`}
            disabled={submitted}
            onClick={() => handleSubmit(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p className="joined-line error">{error}</p>}
      <p className="joined-line muted">
        {submitted
          ? `Answer locked in. Waiting for others (${answeredCount}/${aliveCount}).`
          : `Pick a number 0–10. ${answeredCount}/${aliveCount} answered.`}
      </p>
    </section>
  );
}

function AnnouncementView({ roomState, isHost, socket, code }: PhaseBodyProps) {
  function handleContinue() {
    socket.emit('phase-done', code, (ack: Ack) => {
      if (!ack?.ok) console.warn('phase-done rejected:', ack?.error);
    });
  }
  return (
    <section className="phase-body">
      <div className="robot-bubble">
        <p className="robot-label">🤖 robot says</p>
        <p>{roomState.robotScript ?? '…'}</p>
      </div>
      <div className="answers-list">
        <p className="field-label">Question</p>
        <p className="prompt-text">{roomState.currentQuestion}</p>
        <p className="field-label" style={{ marginTop: 12 }}>Answers</p>
        <ul className="player-list">
          {(roomState.roundAnswers ?? []).map((a) => (
            <li key={a.socketId} className="player-chip">
              {a.name}: <strong>{a.answer}</strong>
            </li>
          ))}
        </ul>
      </div>
      {isHost ? (
        <button className="button" type="button" onClick={handleContinue}>
          Continue
        </button>
      ) : (
        <p className="joined-line muted">Waiting for the host to continue…</p>
      )}
    </section>
  );
}

function DefenseView({ roomState, isHost, socket, code }: PhaseBodyProps) {
  function handleSkip() {
    socket.emit('phase-done', code, (ack: Ack) => {
      if (!ack?.ok) console.warn('skip rejected:', ack?.error);
    });
  }
  return (
    <section className="phase-body">
      <p className="prompt-text">Defend yourselves! Talk it out — 2 minutes.</p>
      <Countdown deadline={roomState.phaseDeadline} large />
      <div className="answers-list">
        <p className="field-label">Answers</p>
        <ul className="player-list">
          {(roomState.roundAnswers ?? []).map((a) => (
            <li key={a.socketId} className="player-chip">
              {a.name}: <strong>{a.answer}</strong>
            </li>
          ))}
        </ul>
      </div>
      {isHost && (
        <button className="button" type="button" onClick={handleSkip}>
          Skip discussion → vote
        </button>
      )}
    </section>
  );
}

function VotingView({ roomState, socket, socketId, code }: PhaseBodyProps) {
  const [error, setError] = useState<string | null>(null);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);

  function vote(votedFor: string) {
    setSubmittedFor(votedFor);
    socket.emit('submit-vote', { code, votedFor }, (ack: Ack) => {
      if (!ack?.ok) {
        setError(ack?.error ?? 'Failed to vote');
        setSubmittedFor(null);
      }
    });
  }

  const submitted = roomState.yourVoteSubmitted;
  const candidates = roomState.players.filter((p) => p.isAlive && p.socketId !== socketId);
  const aliveCount = roomState.players.filter((p) => p.isAlive).length;
  const votedCount = roomState.players.filter((p) => p.isAlive && p.hasVoted).length;

  return (
    <section className="phase-body">
      <p className="prompt-text">Who do you think is the spy?</p>
      <Countdown deadline={roomState.phaseDeadline} />

      <ul className="vote-list">
        {candidates.map((p) => (
          <li key={p.socketId}>
            <button
              type="button"
              className={`button vote-btn${submittedFor === p.socketId ? ' vote-btn-selected' : ''}`}
              disabled={submitted}
              onClick={() => vote(p.socketId)}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="joined-line error">{error}</p>}
      <p className="joined-line muted">
        {submitted
          ? `Vote locked in. Waiting for others (${votedCount}/${aliveCount}).`
          : `${votedCount}/${aliveCount} have voted.`}
      </p>
    </section>
  );
}

function GameOverView({ roomState }: PhaseBodyProps) {
  return (
    <section className="phase-body">
      <div className="robot-bubble">
        <p className="robot-label">🤖 robot says</p>
        <p>{roomState.robotScript ?? '…'}</p>
      </div>
      <p className="prompt-text">
        {roomState.winner === 'players' ? 'Players win!' : 'The spy wins!'}
      </p>
      {roomState.spy && (
        <p className="joined-line muted">
          The spy was <strong>{roomState.spy.name}</strong>.
        </p>
      )}
    </section>
  );
}

function Countdown({ deadline, large = false }: { deadline: number | null; large?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  return <p className={`countdown${large ? ' countdown-large' : ''}`}>{remaining}s</p>;
}
