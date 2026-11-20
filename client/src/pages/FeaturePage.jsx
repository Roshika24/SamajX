import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

/** Shared, polished workspace placeholder for routes awaiting upcoming workflow phases. */
export default function FeaturePage({ eyebrow = 'SamajX Workspace', title, description, nextStep }) {
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 960, margin: '0 auto' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            {eyebrow}
          </span>
          <Badge variant="neutral">Roadmap Planned</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          {title}
        </h1>
        {description && (
          <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
            {description}
          </p>
        )}
      </div>

      <Card>
        <div style={{ padding: '24px 16px', display: 'grid', gap: 20, placeItems: 'center', textAlign: 'center' }}>
          <EmptyState
            title="Module In Active Development"
            message={
              nextStep ||
              'This route is registered in the SamajX routing tree. The backend endpoint and data workflows are slated for the upcoming release.'
            }
          />
          <Link to="/">
            <Button variant="secondary" size="small">
              ← Return to Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
