import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function UniversityCompletionPage() {
  const [items, setItems] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState({});
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [queueRes, compRes] = await Promise.all([
        api.get('/projects/university/review-queue'),
        api.get('/projects/university/completed')
      ]);
      setItems(queueRes.data || []);
      setCompletedProjects(compRes.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(id, decision) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post(`/projects/${id}/completion-decision`, {
        decision,
        feedback: feedback[id] || ''
      });
      setNotice(decision === 'approve' ? `Project #${id} approved! Certificates have been generated.` : `Project #${id} reopened.`);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1000 }}>
      <div>
        <p className="eyebrow">COMPLETION SIGN-OFF & CERTIFICATES</p>
        <h1 style={{ margin: '4px 0 8px 0' }}>Project completion review</h1>
        <p style={{ margin: 0, color: '#555' }}>
          Review final deliverables, reports, and evidence before approving completion and issuing cryptographic student certificates.
        </p>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-danger, #d32f2f)', background: '#ffebee', padding: 12, borderRadius: 6 }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--color-success, #2e7d32)', background: '#e8f5e9', padding: 12, borderRadius: 6 }}>{notice}</p>}

      {/* ── SECTION 1: PENDING COMPLETION REVIEWS ── */}
      <div>
        <h2>1. Pending Completion Reviews</h2>
        <p style={{ color: '#666', marginTop: -6 }}>
          Projects submitted by team leaders awaiting final university approval and certificate issuance.
        </p>

        {!items.length ? (
          <Card style={{ padding: 20 }}>
            No projects are currently waiting for completion review.
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {items.map(p => (
              <Card key={p.id} style={{ padding: 22, display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>{p.problem_title}</h3>
                    <p style={{ margin: 0, color: '#555' }}>
                      Team: <strong>{p.team_name}</strong> · Project #{p.id}
                    </p>
                  </div>
                  <Badge variant="warning">Submitted for review</Badge>
                </div>

                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6 }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>Final Report</h4>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.92rem', color: '#333' }}>
                    {p.final_report}
                  </p>
                </div>

                {Boolean(p.final_proof_urls?.length) && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>Proof & Artifacts</h4>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {p.final_proof_urls.map(u => (
                        <li key={u}>
                          <a href={u} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                            {u}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.demo_link && (
                  <p style={{ margin: 0 }}>
                    <strong>Live Demo:</strong>{' '}
                    <a href={p.demo_link} target="_blank" rel="noreferrer">
                      {p.demo_link}
                    </a>
                  </p>
                )}

                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <label htmlFor={`feedback-${p.id}`} style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    Administrator Feedback (Required only if reopening):
                  </label>
                  <textarea
                    id={`feedback-${p.id}`}
                    placeholder="Provide constructive feedback or explain what deliverables need revision..."
                    value={feedback[p.id] || ''}
                    onChange={e => setFeedback(v => ({ ...v, [p.id]: e.target.value }))}
                    style={{ minHeight: 80, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Button loading={busy} onClick={() => decide(p.id, 'approve')}>
                    Approve & issue certificates
                  </Button>
                  <Button variant="secondary" loading={busy} onClick={() => decide(p.id, 'reopen')}>
                    Reopen project
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: APPROVED COMPLETIONS & ISSUED CERTIFICATES ── */}
      <div>
        <h2>2. Approved Completions & Issued Certificates</h2>
        <p style={{ color: '#666', marginTop: -6 }}>
          Historical record of verified student solutions and their issued cryptographic completion certificates.
        </p>

        {!completedProjects.length ? (
          <Card style={{ padding: 20 }}>
            No approved completions recorded yet.
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {completedProjects.map(cp => (
              <Card key={cp.id} style={{ padding: 18, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>{cp.problem_title}</h3>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.9rem' }}>
                      Team: <strong>{cp.team_name}</strong> · Approved on {new Date(cp.completed_at || cp.completion_approved_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="success">Completed & Certified</Badge>
                </div>

                {Boolean(cp.certificates?.length) && (
                  <div style={{ background: '#f4fbf4', padding: 12, borderRadius: 6, border: '1px solid #c8e6c9' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', color: '#2e7d32' }}>
                      Issued Student Certificates ({cp.certificates.length}):
                    </h4>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {cp.certificates.map(cert => (
                        <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                          <span><strong>{cert.member_name}</strong></span>
                          <span style={{ fontFamily: 'monospace', color: '#666', fontSize: '0.8rem' }}>
                            Code: {cert.verification_code.substring(0, 16)}...
                          </span>
                          <a
                            href={`/verify/${cert.verification_code}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.85rem' }}
                          >
                            Verify Publicly →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
