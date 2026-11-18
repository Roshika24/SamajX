import Card from '../components/Card';
import EmptyState from '../components/EmptyState';

/** Shared, honest empty state for routes whose API workflow is not implemented yet. */
export default function FeaturePage({ eyebrow = 'CIVICPULSE', title, description, nextStep }) {
  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 900 }}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p style={{ color: 'var(--color-ink-muted)' }}>{description}</p>
      </div>
      <Card style={{ padding: 22 }}>
        <EmptyState
          title="This workspace is ready for implementation"
          description={nextStep || 'The route is now registered and will no longer redirect to the dashboard. Its complete data workflow is not yet available in this project version.'}
        />
      </Card>
    </div>
  );
}
