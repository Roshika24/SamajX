import { Link } from 'react-router-dom';
import Card from '../../components/Card';

const linkButton = { display: 'inline-flex', padding: '10px 18px', borderRadius: 999, background: 'var(--color-ink)', color: 'white', fontWeight: 600 };
const linkButtonSecondary = { ...linkButton, background: 'white', color: 'var(--color-ink)', border: '1px solid var(--color-gray-300)' };

export default function CitizenDashboard() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <header><p className="eyebrow">CITIZEN SPACE</p><h1>Your community dashboard</h1><p style={{ color: 'var(--color-ink-muted)' }}>Report local issues, follow community problems and help bring attention to what matters.</p></header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
        <Card><h3>Report an issue</h3><p>Pin a location and describe a civic problem in your area.</p><Link to="/citizen/report" style={linkButton}>Report a problem</Link></Card>
        <Card><h3>Explore the problem feed</h3><p>See what other citizens have reported and support active problems.</p><Link to="/citizen/problems" style={linkButtonSecondary}>Browse problems</Link></Card>
        <Card><h3>Track your reports</h3><p>Review report status and resolve possible duplicate matches.</p><Link to="/citizen/reports" style={linkButtonSecondary}>My reports</Link></Card>
      </div>
    </div>
  );
}
