import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';

export default function UniversityTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get('/teams?limit=100');
      setTeams(result.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            CAMPUS DIRECTORY
          </span>
          <Badge variant="primary">{teams.length} Squads Registered</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          University Engineering Squads
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Directory of student innovation teams registered under your campus, their capability tiers, and leadership approval status.
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
          <p role="status" style={{ color: 'var(--color-ink-muted)' }}>Loading university teams…</p>
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <EmptyState
            title="No Student Teams Registered Yet"
            message="Approved team leaders will appear here after they assemble their squads and start engineering solutions."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {teams.map((team) => (
            <Card key={team.id} hover>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)' }}>
                      {team.name}
                    </h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                      Leader: <strong style={{ color: 'var(--color-ink)' }}>{team.leader_name}</strong>
                    </div>
                  </div>
                  <Badge variant={team.leader_status === 'approved' ? 'success' : 'warning'}>
                    {team.leader_status === 'approved' ? 'Verified Leader' : 'Pending Approval'}
                  </Badge>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-ink-muted)' }}>Squad Size: </span>
                    <strong style={{ color: 'var(--color-ink)' }}>{team.member_count} members</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-ink-muted)' }}>Tier: </span>
                    <strong style={{ color: 'var(--color-primary)', textTransform: 'capitalize' }}>
                      {team.level || 'Beginner'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>Average Verified Score:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-surface-sunken)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {Number(team.level_score || 0).toFixed(2)} XP
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
