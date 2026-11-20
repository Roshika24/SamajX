import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';

export default function CitizenDashboard() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {/* Welcome Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-8) var(--space-6)',
        color: 'white',
        border: '1px solid #334155',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-4)'
      }}>
        <div>
          <span style={{
            display: 'inline-block',
            fontSize: 'var(--text-2xs)',
            fontWeight: 'var(--weight-bold)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: 'rgba(37, 99, 235, 0.25)',
            color: '#93C5FD',
            padding: '3px 10px',
            borderRadius: 999,
            marginBottom: 'var(--space-2)'
          }}>
            Citizen Hub
          </span>
          <h1 style={{ color: 'white', margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-3xl)', fontWeight: 800 }}>
            Welcome, {user?.display_name || 'Neighbor'} 👋
          </h1>
          <p style={{ color: '#94A3B8', margin: 0, fontSize: 'var(--text-sm)', maxWidth: 540 }}>
            Report local civic concerns, support community problems, and track student engineering teams working to resolve them.
          </p>
        </div>

        <Link to="/citizen/report">
          <Button variant="primary" size="lg" style={{ boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)' }}>
            + Report New Problem
          </Button>
        </Link>
      </div>

      {/* Main 3 Action Pillars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
        <Card variant="interactive" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>Report a Problem</h3>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)', flex: 1, marginBottom: 'var(--space-5)' }}>
            Pin an issue on the map, provide details, upload photos, and choose optional anonymity.
          </p>
          <Link to="/citizen/report" style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ width: '100%' }}>Report Issue →</Button>
          </Link>
        </Card>

        <Card variant="interactive" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>Community Feed</h3>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)', flex: 1, marginBottom: 'var(--space-5)' }}>
            Browse issues reported by other citizens, view interactive map markers, and upvote priorities.
          </p>
          <Link to="/citizen/problems" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" style={{ width: '100%' }}>Explore Problems →</Button>
          </Link>
        </Card>

        <Card variant="interactive" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>My Submissions</h3>
          <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)', flex: 1, marginBottom: 'var(--space-5)' }}>
            Track resolution status, check university routing, and confirm or reject duplicate candidates.
          </p>
          <Link to="/citizen/reports" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" style={{ width: '100%' }}>Track My Reports →</Button>
          </Link>
        </Card>
      </div>

      {/* Civic Action Guide */}
      <Card style={{ padding: 'var(--space-6)' }}>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-3)' }}>
          How Your Reports Create Real Impact
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13, flexShrink: 0 }}>1</span>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>You Spot & Pin</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: 0 }}>Pin the location accurately and add photo evidence.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13, flexShrink: 0 }}>2</span>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>AI Triage & Routing</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: 0 }}>Matched to nearby university engineering departments.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13, flexShrink: 0 }}>3</span>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Students Deliver Solutions</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', margin: 0 }}>Teams prototype and deploy verified solutions.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

