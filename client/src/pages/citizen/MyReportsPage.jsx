import { useEffect, useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { api } from '../../utils/api';

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { const response = await api.get('/reports/mine'); setReports(response.data || []); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function decide(reportId, sameProblem) {
    try { await api.post(`/reports/${reportId}/duplicate-decision`, { sameProblem }); await load(); }
    catch (e) { setError(e.message); }
  }
  async function remove(reportId) {
    if (!window.confirm('Delete this report from your account? The public problem record and aggregate history may remain.')) return;
    try { await api.delete(`/reports/${reportId}`); await load(); }
    catch (e) { setError(e.message); }
  }
  return <div style={{ display: 'grid', gap: 18 }}><header><p className="eyebrow">CITIZEN · YOUR ACTIVITY</p><h1>My reports</h1><p style={{ color: 'var(--color-ink-muted)' }}>Track the reports you have submitted and respond to possible duplicate matches.</p></header>
    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
    {loading ? <p role="status">Loading your reports…</p> : reports.length === 0 ? <Card><h3>You haven't submitted a report yet</h3><p>When you report a civic issue, it will appear here.</p></Card> : reports.map((report) => <Card key={report.id}><p className="eyebrow">{report.category} · {new Date(report.created_at).toLocaleString()}</p><h3>{report.title}</h3><p>{report.description}</p><p><strong>Tracking:</strong> {report.problem_status || (report.duplicate_candidate_id ? 'Possible duplicate — your decision needed' : 'Awaiting problem link')}</p>
      {report.duplicate_candidate_id && <div style={{ padding: 14, borderRadius: 10, background: 'var(--color-gray-50)' }}><p>A similar nearby problem was found: <strong>{report.duplicate_candidate_title}</strong> ({Math.round(Number(report.duplicate_candidate_confidence) * 100)}% text similarity).</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Button onClick={() => decide(report.id, true)}>Yes, same problem</Button><Button variant="secondary" onClick={() => decide(report.id, false)}>No, separate problem</Button></div></div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><Button variant="secondary" onClick={() => remove(report.id)}>Delete my report</Button></div>
    </Card>)}
  </div>;
}
