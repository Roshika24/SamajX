import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function UniversityDashboard() {
  const [university, setUniversity] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(async () => {
    const result = await api.get('/universities/me');
    const uni = result.data.university;
    setUniversity(uni);
    const [leaderResult, evidenceResult] = await Promise.all([
      api.get('/leaders?status=pending&limit=100'),
      api.get(`/evidence/queue/${uni.id}?limit=100`),
    ]);
    setLeaders(leaderResult.data || []);
    setEvidence(evidenceResult.data || []);
  }, []);
  useEffect(() => { refresh().catch(e => setError(e.message)); }, [refresh]);

  async function action(path, id) {
    setBusyId(id); setError('');
    try { await api.patch(path, {}); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  async function regenerate() {
    setBusyId('promo'); setError('');
    try { await api.post(`/universities/${university.id}/promo-code/regenerate`, {}); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  async function revoke() {
    setBusyId('promo'); setError('');
    try { await api.post(`/universities/${university.id}/promo-code/revoke`, {}); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  if (!university && !error) return <p>Loading university workspace…</p>;
  return <div style={{ display: 'grid', gap: 22 }}>
    <div><p className="eyebrow">UNIVERSITY CONTROL ROOM</p><h1>{university?.name || 'University dashboard'}</h1><p style={{ color: 'var(--color-ink-muted)' }}>Review your student leaders, verify their credentials and keep your departments up to date.</p></div>
    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
    <Card style={{ padding: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><Badge variant={university?.verified ? 'success' : 'warning'}>{university?.verified ? 'Verified university' : 'Awaiting platform verification'}</Badge><h2 style={{ margin: '12px 0 4px' }}>Your leader promo code</h2><p style={{ color: 'var(--color-ink-muted)', margin: 0 }}>Share this code only with students who should join your university.</p></div><div style={{ textAlign: 'right' }}><strong style={{ fontSize: 28, letterSpacing: 3 }}>{university?.promo_code || '—'}</strong><p style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{university?.promo_code_join_count || 0} / {university?.promo_code_join_limit || 0} joins</p></div></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}><Button onClick={regenerate} loading={busyId === 'promo'}>Regenerate code</Button><Button variant="secondary" onClick={revoke} loading={busyId === 'promo'}>Revoke code</Button></div><small style={{ color: 'var(--color-ink-muted)' }}>Expires: {university?.promo_code_expires_at ? new Date(university.promo_code_expires_at).toLocaleDateString() : 'No expiry'}</small>
    </Card>
    <section><h2>Departments</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(university?.departments || []).map(d => <Badge key={d.id}>{d.name}</Badge>)}</div></section>
    <section><h2>Leader approval queue <span style={{ color: 'var(--color-purple)' }}>({leaders.length})</span></h2>{leaders.length ? <div style={{ display: 'grid', gap: 12 }}>{leaders.map(l => <Card key={l.id} style={{ padding: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><strong>{l.display_name}</strong><p style={{ margin: '4px 0', color: 'var(--color-ink-muted)' }}>{l.email} · {l.enrollment_number || 'Enrollment not set'} · {l.branch || 'Branch not set'} · Year {l.year || '—'}</p></div><div style={{ display: 'flex', gap: 8 }}><Button size="sm" onClick={() => action(`/leaders/${l.id}/approve`, l.id)} loading={busyId === l.id}>Approve</Button><Button size="sm" variant="secondary" onClick={() => action(`/leaders/${l.id}/reject`, l.id)} loading={busyId === l.id}>Reject</Button></div></div></Card>)}</div> : <EmptyState title="No leaders waiting" description="New leader signups using your promo code will appear here." />}</section>
    <section><h2>Evidence verification <span style={{ color: 'var(--color-purple)' }}>({evidence.length})</span></h2>{evidence.length ? <div style={{ display: 'grid', gap: 12 }}>{evidence.map(item => <Card key={item.id} style={{ padding: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><strong>{item.title}</strong><p style={{ margin: '4px 0', color: 'var(--color-ink-muted)' }}>{item.member_name} · {item.team_name} · {item.type}</p>{item.description && <p>{item.description}</p>}{item.link && <a href={item.link} target="_blank" rel="noreferrer">View evidence ↗</a>}</div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Button size="sm" onClick={() => action(`/evidence/${item.id}/verify`, item.id)} loading={busyId === item.id}>Verify</Button><Button size="sm" variant="secondary" onClick={() => action(`/evidence/${item.id}/reject`, item.id)} loading={busyId === item.id}>Reject</Button></div></div></Card>)}</div> : <EmptyState title="Evidence queue is clear" description="Submitted projects, hackathons, internships and faculty experience will appear here." />}</section>
  </div>;
}
