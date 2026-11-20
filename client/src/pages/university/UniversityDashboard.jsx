import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function UniversityDashboard() {
  const [university, setUniversity] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const result = await api.get('/universities/me');
    const uni = result.data.university;
    setUniversity(uni);
    const [leaderResult, evidenceResult, problemResult] = await Promise.all([
      api.get('/leaders?status=pending&limit=100'),
      api.get(`/evidence/queue/${uni.id}?limit=100`),
      api.get('/applications/university/problems').catch(() => ({ data: [] })),
    ]);
    setLeaders(leaderResult.data || []);
    setEvidence(evidenceResult.data || []);
    setProblems(problemResult.data || []);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);

  async function action(path, id) {
    setBusyId(id);
    setError('');
    try {
      await api.patch(path, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function regenerate() {
    setBusyId('promo');
    setError('');
    try {
      await api.post(`/universities/${university.id}/promo-code/regenerate`, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function revoke() {
    setBusyId('promo');
    setError('');
    try {
      await api.post(`/universities/${university.id}/promo-code/revoke`, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function copyCode() {
    if (!university?.promo_code) return;
    navigator.clipboard.writeText(university.promo_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!university && !error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
        <p role="status" style={{ color: 'var(--color-ink-muted)' }}>Loading university workspace…</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            INSTITUTIONAL ADMINISTRATION
          </span>
          <Badge variant={university?.verified ? 'success' : 'warning'}>
            {university?.verified ? '✓ Verified Campus' : 'Verification In Progress'}
          </Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          {university?.name || 'University Control Room'}
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Manage campus student leaders, verify academic credential evidence, and oversee routed civic problem proposals.
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

      {/* Promo Code Management Card */}
      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-primary)' }}>
                LEADER ONBOARDING CREDENTIAL
              </span>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: '4px 0 6px 0' }}>
                Campus Leader Promo Code
              </h2>
              <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-sm)', margin: 0, maxWidth: 540 }}>
                Share this secure authorization code with student leaders to grant them access to register teams under {university?.name}.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>Active Code</div>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--color-primary)' }}>
                  {university?.promo_code || '—'}
                </strong>
              </div>
              <Button size="small" variant="secondary" onClick={copyCode}>
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Join meter and dates */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-ink-muted)',
            }}
          >
            <div>
              Usage Quota: <strong>{university?.promo_code_join_count || 0}</strong> of{' '}
              <strong>{university?.promo_code_join_limit || 0}</strong> students joined
            </div>
            <div>
              Expiration:{' '}
              {university?.promo_code_expires_at
                ? new Date(university.promo_code_expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
                : 'No expiration date set'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" variant="ghost" onClick={regenerate} loading={busyId === 'promo'}>
                Regenerate Code
              </Button>
              <Button size="small" variant="ghost" onClick={revoke} loading={busyId === 'promo'} style={{ color: 'var(--color-danger)' }}>
                Revoke Code
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Departments Section */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', marginBottom: 10 }}>
          Registered Departments & Engineering Schools
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(university?.departments || []).length ? (
            university.departments.map((d) => (
              <Badge key={d.id} variant="neutral">
                🏛️ {d.name}
              </Badge>
            ))
          ) : (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
              No specific departments registered yet.
            </span>
          )}
        </div>
      </div>

      {/* Leader Approval Queue */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Leader Approval Queue ({leaders.length})
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>
              Student leaders awaiting enrollment identity verification.
            </p>
          </div>
        </div>

        {leaders.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {leaders.map((l) => (
              <Card key={l.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
                      {l.display_name}
                    </h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                      <span>{l.email}</span> · <span>Enrollment: <strong>{l.enrollment_number || 'Not provided'}</strong></span> ·{' '}
                      <span>Branch: <strong>{l.branch || 'Not provided'}</strong></span> · <span>Year: <strong>{l.year || '—'}</strong></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="small"
                      variant="primary"
                      onClick={() => action(`/leaders/${l.id}/approve`, l.id)}
                      loading={busyId === l.id}
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => action(`/leaders/${l.id}/reject`, l.id)}
                      loading={busyId === l.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="No Leaders Waiting for Approval"
              message="New student leader signups using your university promo code will appear here for verification."
            />
          </Card>
        )}
      </div>

      {/* Evidence Verification Queue */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Evidence Verification Queue ({evidence.length})
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>
              Verify student certifications, lab experiences, and hackathon accomplishments to award XP.
            </p>
          </div>
        </div>

        {evidence.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {evidence.map((item) => (
              <Card key={item.id}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Badge variant="primary">{item.type?.replaceAll('_', ' ')}</Badge>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                          Student: <strong>{item.member_name}</strong> · Squad: <strong>{item.team_name}</strong>
                        </span>
                      </div>
                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        {item.title}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="primary"
                        onClick={() => action(`/evidence/${item.id}/verify`, item.id)}
                        loading={busyId === item.id}
                      >
                        ✓ Verify & Award XP
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => action(`/evidence/${item.id}/reject`, item.id)}
                        loading={busyId === item.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>

                  {item.description && (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                  )}

                  {item.link && (
                    <div style={{ paddingTop: 4 }}>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        🔗 View External Evidence Document ↗
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="Evidence Queue is Clear"
              message="No student credential evidence is waiting for verification. When students submit projects or endorsements, they will appear here."
            />
          </Card>
        )}
      </div>

      {/* Civic Problems Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Civic Problems & Projects ({problems.length})
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>
              Civic issues across your regional jurisdiction.
            </p>
          </div>
          <Link
            to="/admin/university/problems"
            style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            Review AI Assessments & Proposals →
          </Link>
        </div>

        {problems.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {problems.slice(0, 6).map((p) => (
              <Card key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink)' }}>
                      #{p.id} · {p.title}
                    </h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                      Domain: <strong>{p.domain_name || 'Unassigned'}</strong> · Difficulty:{' '}
                      <strong>{p.difficulty || p.ai_suggested_difficulty || 'Pending'}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={p.distance_label === 'Far away' ? 'warning' : 'info'}>
                      📍 {p.distance_km} km {p.distance_label === 'Far away' ? '· Far away' : '· Within range'}
                    </Badge>
                    <Badge variant={p.status === 'open_for_applications' ? 'success' : 'default'}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="No Civic Problems Found"
              message="Reported community problems routed to your jurisdiction will appear here."
            />
          </Card>
        )}
      </div>
    </div>
  );
}
