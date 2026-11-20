import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function LeaderApplicationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/applications/mine')
      .then((r) => setItems(r.data || r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function getStatusVariant(status) {
    switch (status?.toLowerCase()) {
      case 'selected':
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'submitted':
      case 'in_review':
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
            PROPOSAL TRACKING
          </span>
          <Badge variant="primary">{items.length} Submitted</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          My Team's Proposals
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Real-time status of civic solutions submitted by your squad, including faculty peer reviews and evaluation scores.
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
          <p role="status" style={{ color: 'var(--color-ink-muted)' }}>Loading submitted applications…</p>
        </div>
      ) : !items.length ? (
        <Card>
          <EmptyState
            title="No Proposals Submitted Yet"
            message="Your squad hasn't submitted proposals for any civic challenges yet. Browse routed problems to start."
            actionText="Browse Civic Problems"
            onAction={() => window.location.href = '/leader/problems'}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {items.map((a) => (
            <Card key={a.id}>
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Title and Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-ink-muted)' }}>
                      Squad: <strong>{a.team_name}</strong>
                    </span>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: '4px 0 0 0' }}>
                      {a.problem_title}
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a.score != null && (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                          fontWeight: 700,
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        Rank #{a.rank} · Score: {Number(a.score).toFixed(1)}
                      </span>
                    )}
                    <Badge variant={getStatusVariant(a.status)}>
                      {a.status?.replaceAll('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Mentor Note */}
                {a.mentor_name && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                    <span>Faculty / Mentor: </span>
                    <strong>{a.mentor_name}</strong>
                  </div>
                )}

                {/* Feedback Note if available */}
                {a.feedback && (
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-surface-sunken)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--color-primary)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-ink)',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginBottom: 2 }}>
                      Evaluator Feedback:
                    </strong>
                    {a.feedback}
                  </div>
                )}

                {/* University Reviews Section */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                  <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)', margin: '0 0 10px 0' }}>
                    University Review Status
                  </h3>
                  {a.university_reviews?.length ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {a.university_reviews.map((r) => (
                        <div
                          key={r.university_id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            backgroundColor: 'var(--color-surface-sunken)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                              {r.university_name}
                            </strong>
                            {r.feedback && (
                              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: '2px 0 0 0' }}>
                                "{r.feedback}"
                              </p>
                            )}
                          </div>
                          <Badge variant={getStatusVariant(r.status)}>
                            {r.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                      Pending review by designated university faculty evaluators.
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
