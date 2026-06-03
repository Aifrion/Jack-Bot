import { useParams, useNavigate } from 'react-router-dom';

export function Results() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();

  return (
    <main className="page">
      <div className="card">
        <header className="brand">
          <h1 className="title">RESULTS</h1>
          <p className="tagline">Room <strong>{code}</strong></p>
        </header>
        <p className="joined-line">Final scores will appear here.</p>
        <button className="button" type="button" onClick={() => navigate('/')}>
          Back to start
        </button>
      </div>
    </main>
  );
}
