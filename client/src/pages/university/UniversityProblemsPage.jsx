import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function UniversityProblemsPage() {
  const [routedProblems, setRoutedProblems] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState({});

  async function load() {
    try {
      const [probRes, appRes] = await Promise.all([
        api.get('/applications/university/problems'),
        api.get('/applications/university/reviews')
      ]);
      setRoutedProblems(probRes.data || []);
      setApplications(appRes.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reviewApplication(id, decision) {
    setBusy(v => ({ ...v, [`app_${id}`]: true }));
    setError('');
    setNotice('');

    try {
      await api.patch(`/applications/${id}/university-review`, {
        decision,
        feedback: ''
      });
      setNotice(`Application #${id} ${decision}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(v => ({ ...v, [`app_${id}`]: false }));
    }
  }

  async function reviewDifficulty(problemId, action, overrideDifficulty) {
    setBusy(v => ({ ...v, [`diff_${problemId}`]: true }));
    setError('');
    setNotice('');

    try {
      await api.post(`/ai/problems/${problemId}/difficulty/review`, {
        action,
        overrideDifficulty,
      });
      setNotice(`Difficulty prediction for problem #${problemId} ${action === 'accept' ? 'accepted' : 'overridden'}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(v => ({ ...v, [`diff_${problemId}`]: false }));
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 1000 }}>
      <div>
        <p className="eyebrow">UNIVERSITY · ROUTED PROBLEMS & DIFFICULTY REVIEW</p>
        <h1>Routed problems & applications</h1>
        <p>
          Review civic problems routed to your university, approve or override AI-predicted problem difficulties, and record university approvals for student applications.
        </p>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-danger, #d32f2f)', background: '#ffebee', padding: 12, borderRadius: 6 }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--color-success, #2e7d32)', background: '#e8f5e9', padding: 12, borderRadius: 6 }}>{notice}</p>}

      {/* ── SECTION 1: ROUTED PROBLEMS & AI DIFFICULTY ── */}
      <div>
        <h2>1. Routed Problems & AI Difficulty Review</h2>
        <p style={{ color: '#666', marginTop: -6 }}>
          Civic challenges routed to your university based on academic departments and expertise.
        </p>

        {!routedProblems.length ? (
          <Card style={{ padding: 20 }}>
            No problems are currently routed to your university.
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {routedProblems.map(p => (
              <Card key={p.id} style={{ padding: 18, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>#{p.id} · {p.title}</h3>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>
                      Status: <strong>{p.status}</strong> · {p.distance_km ? `${p.distance_km} km away` : 'Campus vicinity'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge variant={p.distance_label === 'Far away' ? 'danger' : 'info'}>
                      📍 {p.distance_km ? `${p.distance_km} km` : '0 km'} {p.distance_label === 'Far away' ? '· Far away' : '· Within range'}
                    </Badge>
                    <Badge variant="neutral">{p.domain_name || 'General'}</Badge>
                    <Badge variant={p.difficulty === 'hard' ? 'danger' : p.difficulty === 'medium' ? 'warning' : 'info'}>
                      Current: {p.difficulty ? p.difficulty.toUpperCase() : 'PENDING'}
                    </Badge>
                  </div>
                </div>

                {p.description && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#444', background: '#f9f9f9', padding: 10, borderRadius: 6 }}>
                    {p.description}
                  </p>
                )}

                {/* AI Difficulty Review Box */}
                <div style={{ background: '#f0f6ff', border: '1px solid #c6dcff', borderRadius: 8, padding: 14 }}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#0043ce', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🤖 AI Difficulty Assessment
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, textTransform: 'capitalize' }}>
                      Predicted: {p.ai_suggested_difficulty || 'Pending analysis'}
                    </span>
                    <Badge variant={p.ai_difficulty_status === 'accepted' ? 'success' : p.ai_difficulty_status === 'overridden' ? 'warning' : p.ai_difficulty_status === 'failed' ? 'danger' : 'info'}>
                      {p.ai_difficulty_status || 'pending'}
                    </Badge>
                  </div>
                  {p.ai_difficulty_reason && (
                    <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0', color: '#444' }}>
                      <em>"{p.ai_difficulty_reason}"</em>
                    </p>
                  )}

                  {p.ai_difficulty_status === 'suggested' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                      <Button
                        onClick={() => reviewDifficulty(p.id, 'accept')}
                        disabled={busy[`diff_${p.id}`]}
                      >
                        Accept AI Difficulty ({p.ai_suggested_difficulty})
                      </Button>

                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select
                          id={`override-diff-p-${p.id}`}
                          defaultValue={p.difficulty || 'medium'}
                          style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const sel = document.getElementById(`override-diff-p-${p.id}`).value;
                            reviewDifficulty(p.id, 'override', sel);
                          }}
                          disabled={busy[`diff_${p.id}`]}
                        >
                          Override Difficulty
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: STUDENT TEAM APPLICATIONS ── */}
      <div style={{ marginTop: 14 }}>
        <h2>2. Student Team Applications & Approvals</h2>
        <p style={{ color: '#666', marginTop: -6 }}>
          Proposals submitted by student teams awaiting your university's review.
        </p>

        {!applications.length ? (
          <Card style={{ padding: 20 }}>
            No proposals are awaiting application review.
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {applications.map(a => (
              <Card key={a.application_id} style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>{a.problem_title}</h3>
                    <p style={{ margin: 0, color: '#555' }}>
                      Team: <strong>{a.team_name}</strong> (Leader: {a.leader_name}) · Level: {a.level || 'beginner'} (Score: {a.level_score || '0'})
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge variant={a.application_status === 'selected' ? 'success' : a.application_status === 'approved' ? 'success' : 'neutral'}>
                      {a.application_status}
                    </Badge>
                  </div>
                </div>

                <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, fontSize: '0.9rem' }}>
                  {a.mentor_name && <p style={{ margin: '0 0 6px 0' }}><strong>Faculty / Mentor:</strong> {a.mentor_name}</p>}
                  <p style={{ margin: '0 0 6px 0' }}><strong>Approach:</strong> {a.approach}</p>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Timeline:</strong> {a.timeline}</p>
                  <p style={{ margin: '0 0 6px 0' }}><strong>Skills:</strong> {a.skills}</p>
                  <p style={{ margin: 0 }}>
                    <strong>Solution Type:</strong> {a.solution_type} · <strong>Authority needed:</strong>{' '}
                    {a.needs_authority ? 'Yes' : 'No'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <p style={{ margin: 0 }}>
                    University Review Status: <strong>{a.university_review_status}</strong>
                  </p>

                  {a.university_review_status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        disabled={busy[`app_${a.application_id}`]}
                        onClick={() => reviewApplication(a.application_id, 'approved')}
                      >
                        Approve Application
                      </Button>

                      <Button
                        disabled={busy[`app_${a.application_id}`]}
                        variant="secondary"
                        onClick={() => reviewApplication(a.application_id, 'rejected')}
                      >
                        Reject Application
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
