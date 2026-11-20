import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function PlatformAdminDashboard() {
  const [universities, setUniversities] = useState([]);
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(null);

  const refresh = useCallback(async () => {
    const [result, flagResult] = await Promise.all([
      api.get('/universities?verified=false&limit=100'),
      api.get('/problems/moderation/flags?limit=50').catch(() => ({ data: [] })),
    ]);
    setUniversities(result.data || []);
    setFlags(flagResult.data || []);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);

  async function verify(id) {
    setBusy(id);
    setError('');
    setNotice('');
    try {
      await api.patch(`/universities/${id}/verify`, {});
      setNotice(`University #${id} has been officially verified.`);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function reviewFlag(id, status) {
    setBusy(`flag-${id}`);
    setError('');
    setNotice('');
    try {
      await api.patch(`/problems/moderation/flags/${id}`, { status });
      setNotice(`Moderation flag #${id} resolved as ${status}.`);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            PLATFORM GOVERNANCE
          </span>
          <Badge variant="warning">{universities.length} Pending Campuses</Badge>
          <Badge variant="neutral">{flags.length} Flagged Reports</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Platform Administration
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Manage trusted university credentials and moderate community-reported content to protect platform integrity.
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

      {/* University Verification Queue */}
      <section style={{ display: 'grid', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            University Verification Queue ({universities.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Campuses requiring vetting before promo codes become active for student leaders.
          </p>
        </div>

        {universities.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {universities.map((uni) => (
              <Card key={uni.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Badge variant="warning">Verification Needed</Badge>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        ID #{uni.id}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)' }}>
                      {uni.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                      📍 {[uni.city, uni.state, uni.country].filter(Boolean).join(', ') || 'Location unassigned'}
                    </p>
                    {uni.website && (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={uni.website}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          🔗 Institutional Website ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => verify(uni.id)}
                    loading={busy === uni.id}
                  >
                    ✓ Verify University
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="No Universities Awaiting Verification"
              message="All registered institutions are verified. New campus registrations will appear here."
            />
          </Card>
        )}
      </section>

      {/* Moderation Flags Queue */}
      <section style={{ display: 'grid', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            Community Moderation Queue ({flags.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Citizen-flagged discussions, false reports, or offensive content for moderator action.
          </p>
        </div>

        {flags.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {flags.map((flag) => (
              <Card key={flag.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'grid', gap: 6, maxWidth: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant="danger">FLAGGED</Badge>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        Flag #{flag.id} · {new Date(flag.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                      Reason: "{flag.reason || 'Flagged for moderator review'}"
                    </strong>
                    {flag.content && (
                      <div
                        style={{
                          padding: '8px 12px',
                          backgroundColor: 'var(--color-surface-sunken)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-ink-light)',
                        }}
                      >
                        Content: {flag.content}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => reviewFlag(flag.id, 'dismissed')}
                      loading={busy === `flag-${flag.id}`}
                    >
                      Dismiss Flag
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => reviewFlag(flag.id, 'actioned')}
                      loading={busy === `flag-${flag.id}`}
                    >
                      Remove / Action
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="Moderation Queue is Clear"
              message="No community comments or reports are currently flagged for review."
            />
          </Card>
        )}
      </section>
    </div>
  );
}
