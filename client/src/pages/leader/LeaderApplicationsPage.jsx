
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';

export default function LeaderApplicationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/applications/mine')
      .then(r => setItems(r.data || r))
      .catch(e => setError(e.message));
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 1000 }}>
      <div>
        <p className="eyebrow">TEAM LEADER · APPLICATIONS</p>
        <h1>My applications</h1>
        <p>
          Track your submitted proposals and every university review attached
          to each application.
        </p>
      </div>

      {error && <p role="alert">{error}</p>}

      {!items.length && (
        <Card style={{ padding: 20 }}>
          You have not submitted any applications yet.
        </Card>
      )}

      {items.map(a => (
        <Card key={a.id} style={{ padding: 20 }}>
          <h2>{a.problem_title}</h2>
          <p>{a.team_name} · {a.status}</p>

          {a.mentor_name && (
            <p>Mentor: {a.mentor_name}</p>
          )}

          <h3>University reviews</h3>
          {(a.university_reviews || []).map(r => (
            <p key={r.university_id}>
              {r.university_name}: <strong>{r.status}</strong>
              {r.feedback ? ` — ${r.feedback}` : ''}
            </p>
          ))}

          {a.score != null && (
            <p>Ranking: #{a.rank} · Score: {a.score}</p>
          )}

          {a.feedback && <p>Feedback: {a.feedback}</p>}
        </Card>
      ))}
    </div>
  );
}
