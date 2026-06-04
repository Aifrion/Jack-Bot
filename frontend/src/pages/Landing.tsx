import { useNavigate } from 'react-router-dom';
import { JoinForm } from '../components/JoinForm';
import type { JoinPayload } from '../types';

export function Landing() {
  const navigate = useNavigate();

  function handleJoin(payload: JoinPayload) {
    navigate(`/lobby/${payload.roomCode}`, {
      state: { playerName: payload.playerName, shirtColor: payload.shirtColor },
    });
  }

  return (
    <main className="page">
      <div className="card">
        <header className="brand">
          <h1 className="title">JACKBOT</h1>
          <p className="tagline">Enter the room code on the big screen to play.</p>
        </header>
        <JoinForm onJoin={handleJoin} />
      </div>
      <footer className="footer">CSE 276B · Final Project</footer>
    </main>
  );
}
