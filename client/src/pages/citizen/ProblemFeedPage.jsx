import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
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
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      if (status) params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      const [problemResponse, domainResponse] = await Promise.all([
        api.get(`/problems?${params.toString()}`),
        api.get('/domains'),
      ]);
      setItems(problemResponse.data || []);
      setDomains(domainResponse.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [domain, status]);

  async function vote(id) {
    try {
      const response = await api.post(`/problems/${id}/upvote`, {});
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                viewer_upvoted: response.data.upvoted,
                upvote_count: item.upvote_count + (response.data.upvoted ? 1 : -1),
                priority_score: item.priority_score + (response.data.upvoted ? 1 : -1),
              }
            : item
        )
      );
    } catch (e) {
      setError(e.message);
    }
  }

  const getStatusVariant = (s) => {
    switch (s) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'claimed': return 'info';
      case 'open_for_applications': return 'success';
      case 'reported': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="eyebrow">CITIZEN SPACE · COMMUNITY FEED</p>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, margin: '0 0 var(--space-1) 0' }}>Nearby Civic Problems</h1>
          <p style={{ color: 'var(--color-ink-muted)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Discover and support issues in your area. Problems with higher community support receive prioritized university routing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant={!mapView ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMapView(false)}
          >
            📋 List View
          </Button>
          <Button
            variant={mapView ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMapView(true)}
          >
            🗺️ Map View
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, alignItems: 'center' }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems by keyword…"
            aria-label="Search problems"
            style={control}
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-label="Filter by domain"
            style={control}
          >
            <option value="">All Categories / Domains</option>
            {domains.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            style={control}
          >
            <option value="">All Statuses</option>
            {['reported', 'open_for_applications', 'claimed', 'in_progress', 'completed', 'reopened'].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit" variant="secondary" style={{ flex: 1 }}>
              Filter
            </Button>
            <Link to="/citizen/report" style={{ textDecoration: 'none' }}>
              <Button variant="primary">+ Report</Button>
            </Link>
          </div>
        </form>
      </Card>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: 12, borderRadius: 8, color: 'var(--color-danger-text)', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-ink-muted)' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--color-primary-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p>Loading community problems…</p>
        </div>
      ) : mapView && items.length ? (
        <Card padding="none" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <MapContainer
            center={[22.9734, 78.6569]}
            zoom={5}
            scrollWheelZoom
            style={{ height: 520, width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {items.map((item) => (
              <Marker key={item.id} position={[Number(item.lat), Number(item.lng)]}>
                <Popup>
                  <div style={{ padding: 4 }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                      {item.domain_name || item.category}
                    </span>
                    <h4 style={{ margin: '4px 0 6px', fontSize: 14 }}>{item.title}</h4>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#555' }}>
                      {item.report_count} reports · Status: {item.status.replaceAll('_', ' ')}
                    </p>
                    <Link to={`/citizen/problems/${item.id}`} style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-primary)' }}>
                      View details & discussion →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          title="No problems found"
          description="Try selecting different filters or be the first citizen to report an issue in this area."
          action={
            <Link to="/citizen/report">
              <Button variant="primary">Report a Problem</Button>
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {items.map((item) => (
            <Card key={item.id} variant="interactive" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
                    <Badge variant="primary">{item.domain_name || item.category}</Badge>
                    <Badge variant={getStatusVariant(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
                    <Link to={`/citizen/problems/${item.id}`} style={{ color: 'var(--color-ink)', textDecoration: 'none' }}>
                      {item.title}
                    </Link>
                  </h3>

                  <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--text-sm)', lineHeight: '1.5', margin: '0 0 var(--space-4) 0' }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', flexWrap: 'wrap' }}>
                    <span>📍 {Number(item.lat).toFixed(3)}, {Number(item.lng).toFixed(3)}</span>
                    <span>📑 {item.report_count} community report{item.report_count === 1 ? '' : 's'}</span>
                    <span>🕒 {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right Action column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140, alignItems: 'stretch' }}>
                  <Button
                    variant={item.viewer_upvoted ? 'success' : 'primary'}
                    size="sm"
                    onClick={() => vote(item.id)}
                  >
                    {item.viewer_upvoted ? '✓ Supported' : '▲ Support'} ({item.upvote_count})
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const reason = window.prompt('Why should moderators review this problem?');
                      if (reason?.trim()) {
                        try {
                          await api.post(`/problems/${item.id}/flag`, { reason });
                          alert('Flag submitted for moderation review.');
                        } catch (e) {
                          setError(e.message);
                        }
                      }
                    }}
                  >
                    🚩 Flag
                  </Button>

                  <Link to={`/citizen/problems/${item.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                      Details →
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const control = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  border: '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-lg)',
  background: 'white',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-ink)'
};

