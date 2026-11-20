import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

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
        api.get('/projects/university/completed'),
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
        feedback: feedback[id] || '',
      });
      setNotice(
        decision === 'approve'
          ? `Project #${id} successfully approved! Cryptographic completion certificates have been generated for all squad members.`
          : `Project #${id} has been reopened with revision instructions.`
      );
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            INSTITUTIONAL CERTIFICATION
          </span>
          <Badge variant="warning">{items.length} Pending Sign-Off</Badge>
          <Badge variant="success">{completedProjects.length} Certified</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Project Completion Sign-Off
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Examine final engineering deliverables, physical test records, and proof links before approving completion and issuing official student credentials.
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

      {notice && (
        <div
          role="status"
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-emerald-700, #047857)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{notice}</span>
        </div>
      )}

      {/* SECTION 1: PENDING COMPLETION REVIEWS */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            1. Pending Completion Reviews ({items.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Projects submitted by student squads awaiting university evaluation.
          </p>
        </div>

        {!items.length ? (
          <Card>
            <EmptyState
              title="No Pending Completion Reviews"
              message="No student teams are currently awaiting final completion approval."
            />
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {items.map((p) => (
              <Card key={p.id}>
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Badge variant="warning">Submitted for Review</Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                          Project #{p.id}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
                        {p.problem_title}
                      </h3>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                        Squad: <strong>{p.team_name}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Final Report Deliverable */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface-sunken)',
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }}>
                      Final Technical Completion Report
                    </strong>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-ink)', lineHeight: 1.6 }}>
                      {p.final_report}
                    </p>
                  </div>

                  {/* Proof and Artifacts */}
                  {Boolean(p.final_proof_urls?.length) && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }}>
                        Verification Proof & Deployment Artifacts ({p.final_proof_urls.length})
                      </strong>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {p.final_proof_urls.map((u, i) => (
                          <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-surface-sunken)',
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            🔗 Artifact #{i + 1} ↗
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Demo Link */}
                  {p.demo_link && (
                    <div style={{ fontSize: 'var(--text-sm)' }}>
                      <strong style={{ color: 'var(--color-ink)' }}>Interactive Demo: </strong>
                      <a
                        href={p.demo_link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {p.demo_link} ↗
                      </a>
                    </div>
                  )}

                  {/* Feedback Textarea & Actions */}
                  <div style={{ display: 'grid', gap: 10, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <label htmlFor={`feedback-${p.id}`} style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink)' }}>
                      Evaluator Review Notes (Required if requesting revisions / reopening):
                    </label>
                    <textarea
                      id={`feedback-${p.id}`}
                      placeholder="Add specific constructive guidance or explain what additional verification is required…"
                      value={feedback[p.id] || ''}
                      onChange={(e) => setFeedback((v) => ({ ...v, [p.id]: e.target.value }))}
                      rows={3}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--text-sm)',
                        resize: 'vertical',
                        outline: 'none',
                      }}
                    />

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() => decide(p.id, 'reopen')}
                      >
                        Request Revisions (Reopen)
                      </Button>
                      <Button
                        variant="primary"
                        loading={busy}
                        onClick={() => decide(p.id, 'approve')}
                      >
                        ✓ Approve & Issue Official Certificates
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: APPROVED COMPLETIONS */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            2. Approved Completions & Issued Credentials ({completedProjects.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Historical record of certified civic solutions with cryptographic proof.
          </p>
        </div>

        {!completedProjects.length ? (
          <Card>
            <EmptyState
              title="No Completed Projects Yet"
              message="When student projects are verified and approved, their credentials will be logged here."
            />
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {completedProjects.map((cp) => (
              <Card key={cp.id}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Badge variant="success">Completed & Certified</Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                          Approved {new Date(cp.completed_at || cp.completion_approved_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        {cp.problem_title}
                      </h3>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', marginTop: 2 }}>
                        Squad: <strong>{cp.team_name}</strong>
                      </div>
                    </div>
                  </div>

                  {Boolean(cp.certificates?.length) && (
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface-sunken)',
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }}>
                        Issued Cryptographic Certificates ({cp.certificates.length}):
                      </strong>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {cp.certificates.map((cert) => (
                          <div
                            key={cert.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: 'var(--color-surface)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              fontSize: 'var(--text-xs)',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                              🎓 {cert.member_name}
                            </span>
                            <code style={{ color: 'var(--color-ink-muted)', letterSpacing: '0.05em' }}>
                              {cert.verification_code.substring(0, 16)}…
                            </code>
                            <a
                              href={`/verify/${cert.verification_code}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              Verify Publicly ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
