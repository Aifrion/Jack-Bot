import { useNavigate } from 'react-router-dom';

export function Host() {
  const navigate = useNavigate();

  function handleCreate() {
    const placeholderCode = 'DEMO';
    navigate(`/host/${placeholderCode}`);
  }

  return (
    <main className="page">
      <div className="card">
        <header className="brand">
          <h1 className="title">HOST</h1>
          <p className="tagline">Start a new room to share with players.</p>
        </header>
        <button className="button" type="button" onClick={handleCreate}>
          Create room
        </button>
      </div>
    </main>
  );
}
