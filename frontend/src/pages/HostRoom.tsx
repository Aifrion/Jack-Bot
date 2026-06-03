import { useParams } from 'react-router-dom';

export function HostRoom() {
  const { code = '' } = useParams<{ code: string }>();

  return (
    <main className="page">
      <div className="card" style={{ maxWidth: 640 }}>
        <header className="brand">
          <h1 className="title">{code}</h1>
          <p className="tagline">Join at jackbot.local · use this code</p>
        </header>
        <p className="joined-line">Waiting for players to join…</p>
      </div>
    </main>
  );
}
