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
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  return <div style={{ display: 'grid', gap: 18 }}>
    <div><p className="eyebrow">UNIVERSITY · DIRECTORY</p><h1>University teams</h1><p style={{ color: 'var(--color-ink-muted)' }}>Teams registered under your university, including leader approval status and team level.</p></div>
    {error && <p role="alert" style={{ color: 'var(--color-danger, #b42318)' }}>{error}</p>}
    {loading ? <p role="status">Loading teams…</p> : teams.length === 0 ? <EmptyState title="No teams yet" description="Approved team leaders will appear here after they create their teams." /> : <div style={{ display: 'grid', gap: 12 }}>{teams.map(team => <Card key={team.id} style={{ padding: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><h3 style={{ margin: '0 0 6px' }}>{team.name}</h3><p style={{ margin: 0, color: 'var(--color-ink-muted)' }}>Leader: {team.leader_name} · {team.member_count} members</p></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Badge>{team.level}</Badge><Badge variant={team.leader_status === 'approved' ? 'success' : 'warning'}>{team.leader_status}</Badge></div></div><p style={{ marginBottom: 0 }}>Average verified score: {Number(team.level_score || 0).toFixed(2)}</p></Card>)}</div>}
  </div>;
}
