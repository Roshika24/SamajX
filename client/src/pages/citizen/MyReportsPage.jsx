import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import { api } from '../../utils/api';

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get('/reports/mine');
      setReports(response.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(reportId, sameProblem) {
    try {
      await api.post(`/reports/${reportId}/duplicate-decision`, { sameProblem });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(reportId) {
    if (!window.confirm('Delete this report from your account? The public problem record and aggregate history may remain.')) return;
    try {
      await api.delete(`/reports/${reportId}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: 900, margin: '0 auto' }}>
      <header>
        <p className="eyebrow">CITIZEN SPACE · MY ACTIVITY</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, margin: '0 0 var(--space-1) 0' }}>My Submitted Reports</h1>
        <p style={{ color: 'var(--color-ink-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>
          Track the status of civic issues you reported and confirm possible duplicate matches identified by the platform.
        </p>
      </header>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: 14, borderRadius: 8, color: 'var(--color-danger-text)', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-ink-muted)' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--color-primary-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p>Loading your reports…</p>
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          title="You haven't submitted any reports yet"
          description="When you report a local problem like a pothole, water leak, or broken streetlight, it will appear here."
          action={
            <Link to="/citizen/report">
              <Button variant="primary">Submit First Report</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {reports.map((report) => (
            <Card key={report.id} style={{ padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <Badge variant="primary">{report.category}</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', margin: '0 0 var(--space-2) 0' }}>
                    {report.title}
                  </h3>
                </div>

                <Badge variant={report.problem_status ? 'success' : report.duplicate_candidate_id ? 'warning' : 'neutral'}>
                  {report.problem_status
                    ? `Tracking: ${report.problem_status.replaceAll('_', ' ')}`
                    : report.duplicate_candidate_id
                    ? 'Duplicate Action Needed'
                    : 'Awaiting Problem Link'}
                </Badge>
              </div>

              <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: 0 }}>
                {report.description}
              </p>

              {/* Duplicate Candidate Decision Box */}
              {report.duplicate_candidate_id && (
                <div style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-lg)',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  marginTop: 'var(--space-2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>🔍</span>
                    <strong style={{ fontSize: '0.9rem', color: '#92400E' }}>
                      Possible Duplicate Match Identified ({Math.round(Number(report.duplicate_candidate_confidence) * 100)}% Match)
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#78350F', margin: '0 0 var(--space-3) 0' }}>
                    A nearby problem already exists: <strong>"{report.duplicate_candidate_title}"</strong>. Is your report about this same civic issue?
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button size="sm" variant="success" onClick={() => decide(report.id, true)}>
                      ✓ Yes, Same Problem (Merge)
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => decide(report.id, false)}>
                      ✕ No, Separate Issue
                    </Button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <Button variant="ghost" size="sm" onClick={() => remove(report.id)} style={{ color: 'var(--color-danger)' }}>
                  Delete Report Record
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

