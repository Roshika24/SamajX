import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

export default function PlatformAdminDashboard() {
  const [universities, setUniversities] = useState([]);
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const refresh = useCallback(async () => {
    const [result, flagResult] = await Promise.all([
      api.get('/universities?verified=false&limit=100'),
      api.get('/problems/moderation/flags?limit=50'),
    ]);
    setUniversities(result.data || []);
    setFlags(flagResult.data || []);
  }, []);
  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);
  async function verify(id) {
    setBusy(id); setError('');
    try { await api.patch(`/universities/${id}/verify`, {}); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(null); }
  }
  async function reviewFlag(id, status) {
    setBusy(`flag-${id}`); setError('');
    try { await api.patch(`/problems/moderation/flags/${id}`, { status }); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(null); }
  }
  return <div style={{ display: 'grid', gap: 20 }}>
    <div><p className="eyebrow">PLATFORM OPERATIONS</p><h1>Platform admin</h1><p style={{ color: 'var(--color-ink-muted)' }}>Verify university registrations before their promo codes can be used by student leaders.</p></div>
    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
    <section><h2>University verification queue ({universities.length})</h2>{universities.length ? <div style={{ display: 'grid', gap: 12 }}>{universities.map(uni => <Card key={uni.id} style={{ padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h3 style={{ margin: 0 }}>{uni.name}</h3><p style={{ margin: '5px 0', color: 'var(--color-ink-muted)' }}>{[uni.city, uni.state, uni.country].filter(Boolean).join(', ')}</p>{uni.website && <a href={uni.website} target="_blank" rel="noreferrer">University website ↗</a>}</div><Button onClick={() => verify(uni.id)} loading={busy === uni.id}>Verify university</Button></div></Card>)}</div> : <EmptyState title="No university registrations waiting" description="New university accounts will appear here for verification." />}</section>
  </div>;
}
