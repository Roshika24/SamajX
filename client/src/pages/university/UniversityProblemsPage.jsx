
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function UniversityProblemsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState({});

  async function load() {
    try {
      const r = await api.get('/applications/university/reviews');
      setItems(r.data || r);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id, decision) {
    setBusy(v => ({ ...v, [id]: true }));
    setError('');

    try {
      await api.patch(`/applications/${id}/university-review`, {
        decision,
        feedback: ''
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(v => ({ ...v, [id]: false }));
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 1000 }}>
      <div>
        <p className="eyebrow">UNIVERSITY · APPLICATION REVIEW</p>
        <h1>Routed applications</h1>
        <p>
          Your university's decision is recorded separately. Selection cannot
          proceed until every routed university approves.
        </p>
      </div>

      {error && <p role="alert">{error}</p>}

      {!items.length && (
        <Card style={{ padding: 20 }}>
          No applications are awaiting or recorded for your university.
        </Card>
      )}

      {items.map(a => (
        <Card key={a.application_id} style={{ padding: 20 }}>
          <h2>{a.problem_title}</h2>
          <p>
            <strong>{a.team_name}</strong> · {a.leader_name} ·{' '}
            {a.application_status}
          </p>

          {a.mentor_name && <p>Mentor: {a.mentor_name}</p>}

          <p><strong>Approach</strong>: {a.approach}</p>
          <p><strong>Timeline</strong>: {a.timeline}</p>
          <p><strong>Skills</strong>: {a.skills}</p>

          <p>
            Solution: {a.solution_type} · Authority needed:{' '}
            {a.needs_authority ? 'Yes' : 'No'}
          </p>

          <p>
            Review status: <strong>{a.university_review_status}</strong>
          </p>

          {a.university_review_status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                disabled={busy[a.application_id]}
                onClick={() => review(a.application_id, 'approved')}
              >
                Approve
              </Button>

              <Button
                disabled={busy[a.application_id]}
                variant="secondary"
                onClick={() => review(a.application_id, 'rejected')}
              >
                Reject
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
