import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { api } from '../../utils/api';

export default function ProblemFeedPage() {
  const [domains, setDomains] = useState([]);
  const [items, setItems] = useState([]);
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mapView, setMapView] = useState(false);
  async function load() {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(); if (domain) params.set('domain', domain); if (status) params.set('status', status); if (query.trim()) params.set('q', query.trim());
      const [problemResponse, domainResponse] = await Promise.all([api.get(`/problems?${params.toString()}`), api.get('/domains')]);
      setItems(problemResponse.data || []); setDomains(domainResponse.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [domain, status]);
  async function vote(id) {
    try { const response = await api.post(`/problems/${id}/upvote`, {}); setItems((current) => current.map((item) => item.id === id ? { ...item, viewer_upvoted: response.data.upvoted, upvote_count: item.upvote_count + (response.data.upvoted ? 1 : -1), priority_score: item.priority_score + (response.data.upvoted ? 1 : -1) } : item)); }
    catch (e) { setError(e.message); }
  }
  return <div style={{ display: 'grid', gap: 18 }}>
    <header><p className="eyebrow">CITIZEN · COMMUNITY</p><h1>Nearby civic problems</h1><p style={{ color: 'var(--color-ink-muted)' }}>Explore issues reported by citizens and support problems that need attention.</p></header>
    <Card><form onSubmit={(e) => { e.preventDefault(); load(); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search problems" aria-label="Search problems" style={control} />
      <select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Filter by domain" style={control}><option value="">All categories</option>{domains.map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}</select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" style={control}><option value="">All statuses</option>{['reported','open_for_applications','reopened','claimed','in_progress','completed','unrouted'].map((s) => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select>
      <Button type="submit" variant="secondary">Search</Button>
    </form></Card>
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button variant="secondary" onClick={() => setMapView((value) => !value)}>{mapView ? 'Show list' : 'Show map'}</Button></div>
    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
    {loading ? <p role="status">Loading problems…</p> : mapView && items.length ? <Card padding="sm"><MapContainer center={[22.9734, 78.6569]} zoom={5} scrollWheelZoom style={{ height: 480, width: '100%', borderRadius: 12 }}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{items.map((item) => <Marker key={item.id} position={[Number(item.lat), Number(item.lng)]}><Popup><strong>{item.title}</strong><br />{item.report_count} reports · {item.status.replaceAll('_', ' ')}<br /><Link to={`/citizen/problems/${item.id}`}>View details</Link></Popup></Marker>)}</MapContainer></Card> : items.length === 0 ? <Card><h3>No problems found</h3><p>Try another filter or report the first issue in your area.</p><Link to="/citizen/report">Report a problem</Link></Card> : <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item) => <Card key={item.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div style={{ flex: 1, minWidth: 220 }}><p className="eyebrow">{item.domain_name || item.category} · {item.status.replaceAll('_',' ')}</p><h3><Link to={`/citizen/problems/${item.id}`}>{item.title}</Link></h3><p>{item.description}</p><small>{item.report_count} report{item.report_count === 1 ? '' : 's'} · {item.upvote_count} upvotes · {new Date(item.created_at).toLocaleDateString()}</small></div><div style={{ display: 'grid', alignContent: 'start', gap: 8 }}><Button variant={item.viewer_upvoted ? 'secondary' : 'primary'} onClick={() => vote(item.id)}>{item.viewer_upvoted ? 'Supported ✓' : 'Support'} · {item.upvote_count}</Button><Button variant="secondary" onClick={async () => { const reason = window.prompt('Why should moderators review this problem?'); if (reason?.trim()) { try { await api.post(`/problems/${item.id}/flag`, { reason }); alert('Flag submitted for review.'); } catch (e) { setError(e.message); } } }}>Flag</Button></div></div></Card>)}
    </div>}
  </div>;
}
const control = { width: '100%', padding: '10px 12px', border: '1px solid var(--color-gray-300, #d0d5dd)', borderRadius: 9, background: 'white' };
