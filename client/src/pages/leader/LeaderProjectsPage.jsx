import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function LeaderProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [milestone, setMilestone] = useState({});

  async function refresh() {
    setLoading(true);
    try {
      const r = await api.get('/projects/mine');
      setProjects(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addMilestone(id, e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = milestone[id] || {};
      await api.post(`/projects/${id}/milestones`, {
        title: d.title,
        description: d.description,
        proof_urls: d.proof ? d.proof.split('\n').map((x) => x.trim()).filter(Boolean) : [],
      });
      setMilestone((v) => ({ ...v, [id]: { title: '', description: '', proof: '' } }));
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(id, e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = draft[id] || {};
      await api.post(`/projects/${id}/submit-completion`, {
        final_report: d.report,
        proof_urls: (d.proof || '').split('\n').map((x) => x.trim()).filter(Boolean),
        demo_link: d.demo || undefined,
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function getStatusVariant(status) {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      case 'reopened':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            DEPLOYMENT & EXECUTION
          </span>
          <Badge variant="primary">{projects.length} Active</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Active Civic Projects
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Record milestone achievements, upload proof links, and submit completion reports for university sign-off and verifiable credential issuance.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <p role="status" style={{ color: 'var(--color-ink-muted)' }}>Loading active projects…</p>
        </div>
      ) : !projects.length ? (
        <Card>
          <EmptyState
            title="No Active Projects Yet"
            message="Once your proposal is accepted by university evaluators and activated, your execution roadmap will be managed here."
            actionText="View My Proposals"
            onAction={() => window.location.href = '/leader/applications'}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {projects.map((p) => (
            <Card key={p.id}>
              <div style={{ display: 'grid', gap: 20 }}>
                {/* Project Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Badge variant={getStatusVariant(p.status)}>
                        {p.status?.replaceAll('_', ' ').toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        {p.university_name} · Squad: <strong>{p.team_name}</strong>
                      </span>
                    </div>
                    <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
                      {p.problem_title}
                    </h2>
                  </div>
                </div>

                {/* University Feedback if Reopened */}
                {p.completion_feedback && (
                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--color-warning-dark, #b45309)', fontSize: 'var(--text-sm)', marginBottom: 2 }}>
                        University Revision Request
                      </strong>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                        {p.completion_feedback}
                      </p>
                    </div>
                  </div>
                )}

                {/* Project Milestones Timeline */}
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 12 }}>
                    Implementation Milestones ({(p.milestones || []).length})
                  </h3>

                  {(p.milestones || []).length ? (
                    <div style={{ display: 'grid', gap: 12, paddingLeft: 12, borderLeft: '2px solid var(--color-border)' }}>
                      {(p.milestones || []).map((m) => (
                        <div
                          key={m.id}
                          style={{
                            position: 'relative',
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-surface-sunken)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: -21,
                              top: 16,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary)',
                              border: '3px solid var(--color-surface)',
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>{m.title}</strong>
                            <small style={{ color: 'var(--color-ink-muted)' }}>
                              {new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </small>
                          </div>
                          {m.description && (
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-light)', margin: '6px 0 8px 0', lineHeight: 1.5 }}>
                              {m.description}
                            </p>
                          )}
                          {(m.proof_urls || []).length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                              {m.proof_urls.map((u, i) => (
                                <a
                                  key={u}
                                  href={u}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-primary)',
                                    backgroundColor: 'var(--color-surface)',
                                    padding: '3px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-border)',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                  }}
                                >
                                  🔗 Evidence #{i + 1} ↗
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: 'var(--color-ink-muted)',
                        fontSize: 'var(--text-sm)',
                        border: '1px dashed var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      No milestones recorded yet. Post progress updates as your squad builds.
                    </div>
                  )}
                </div>

                {/* Active / Reopened Actions */}
                {['active', 'reopened'].includes(p.status) && (
                  <div style={{ display: 'grid', gap: 20, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                    {/* Add Milestone Form */}
                    <form onSubmit={(e) => addMilestone(p.id, e)} style={{ display: 'grid', gap: 12 }}>
                      <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                        + Post Implementation Milestone
                      </h4>
                      <input
                        placeholder="Milestone title (e.g. Field sensor prototype assembled & calibrated)"
                        required
                        value={milestone[p.id]?.title || ''}
                        onChange={(e) => setMilestone((v) => ({ ...v, [p.id]: { ...v[p.id], title: e.target.value } }))}
                        style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                      <textarea
                        placeholder="What specific components were tested or deployed? What was the outcome?"
                        rows={3}
                        value={milestone[p.id]?.description || ''}
                        onChange={(e) => setMilestone((v) => ({ ...v, [p.id]: { ...v[p.id], description: e.target.value } }))}
                        style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                      />
                      <textarea
                        placeholder="Proof URLs (e.g. GitHub commit link, Google Drive photo evidence, YouTube test clip - one HTTPS link per line)"
                        rows={2}
                        value={milestone[p.id]?.proof || ''}
                        onChange={(e) => setMilestone((v) => ({ ...v, [p.id]: { ...v[p.id], proof: e.target.value } }))}
                        style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" loading={busy} variant="secondary">
                          Post Milestone
                        </Button>
                      </div>
                    </form>

                    {/* Final Completion Form */}
                    <form
                      onSubmit={(e) => submit(p.id, e)}
                      style={{
                        display: 'grid',
                        gap: 12,
                        padding: 16,
                        backgroundColor: 'var(--color-surface-sunken)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                          Submit Final Project Completion Report
                        </h4>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', margin: 0 }}>
                          Provide a comprehensive summary of the solution, physical or software prototype, and measured civic impact (minimum 80 characters).
                        </p>
                      </div>

                      <textarea
                        minLength={80}
                        required
                        rows={5}
                        placeholder="Detailed technical report: problem analysis, architecture, deployment results, verified improvements, limitations, and future scalability…"
                        value={draft[p.id]?.report || ''}
                        onChange={(e) => setDraft((v) => ({ ...v, [p.id]: { ...v[p.id], report: e.target.value } }))}
                        style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                      />
                      <textarea
                        required
                        rows={2}
                        placeholder="Final verification proof links (GitHub repo, research paper, photo album, hardware schematics - one HTTPS link per line)"
                        value={draft[p.id]?.proof || ''}
                        onChange={(e) => setDraft((v) => ({ ...v, [p.id]: { ...v[p.id], proof: e.target.value } }))}
                        style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                      />
                      <input
                        type="url"
                        placeholder="Live interactive demo URL or video walkthrough (optional, HTTPS)"
                        value={draft[p.id]?.demo || ''}
                        onChange={(e) => setDraft((v) => ({ ...v, [p.id]: { ...v[p.id], demo: e.target.value } }))}
                        style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <Button type="submit" loading={busy}>
                          Submit Final Report for Review
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Completed Banner */}
                {p.status === 'completed' && (
                  <div
                    style={{
                      padding: '16px 20px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>🎓</span>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--color-emerald-700, #047857)', fontSize: 'var(--text-sm)' }}>
                          Project Successfully Completed & Certified!
                        </strong>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                          University verification is complete. Official cryptographically signed certificates are now generated for your squad.
                        </span>
                      </div>
                    </div>
                    <Link to="/leader/certificates">
                      <Button variant="success" size="small">
                        View Certificates →
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
