import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function CompanyDashboard() {
  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            CORPORATE PARTNERSHIP
          </span>
          <Badge variant="primary">CSR & ESG Impact Portal</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Industry Sponsorship & Civic Grants
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Empower university engineering squads to build real solutions for verified community problems. Align your corporate social responsibility with measurable local impact.
        </p>
      </div>

      {/* Metric Highlights Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Card hover>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 28 }}>🌱</span>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }}>
              Measurable ESG Value
            </div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
              Direct Community Impact
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
              100% of sponsorship grants support physical hardware, lab testing materials, and deployment for local municipal challenges.
            </p>
          </div>
        </Card>

        <Card hover>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 28 }}>🎓</span>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }}>
              Campus Talent Pipeline
            </div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
              Top Engineering Squads
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
              Engage directly with vetted student leaders and university researchers tackling hardware, IoT, and AI challenges.
            </p>
          </div>
        </Card>

        <Card hover>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 28 }}>🛡️</span>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-muted)' }}>
              Cryptographic Proof
            </div>
            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-ink)', margin: 0 }}>
              Verifiable Milestones
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
              Track deployment progress with tamper-proof university signed reports, GPS coordinates, and milestone photos.
            </p>
          </div>
        </Card>
      </div>

      {/* Sponsorship Focus Areas */}
      <Card>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
              Strategic Civic Focus Areas
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: 0 }}>
              Select domains where your corporate philanthropy creates the highest community returns.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              {
                title: 'Clean Water & Sanitation',
                icon: '💧',
                desc: 'IoT water quality monitors, drainage sensing, and automated filtration for underserved neighborhoods.',
              },
              {
                title: 'Urban Road Safety & Transit',
                icon: '🚦',
                desc: 'Computer-vision pothole detection, street lighting sensors, and pedestrian crossing alerts.',
              },
              {
                title: 'Public Health & Sanitation',
                icon: '🏥',
                desc: 'Smart municipal waste bins, vector-borne disease telemetry, and sanitization tracking.',
              },
              {
                title: 'Clean Campus Energy',
                icon: '⚡',
                desc: 'Solar microgrids, battery storage telemetry, and building energy efficiency automation.',
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                style={{
                  padding: 16,
                  backgroundColor: 'var(--color-surface-sunken)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 24 }}>{pillar.icon}</div>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>{pillar.title}</strong>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Direct Civic Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            <Badge variant="primary">Community Exploration</Badge>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Browse Ground Civic Problems
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
              Review actual citizen-reported infrastructure bottlenecks in regions where your company operates. Identify high-priority challenges for targeted sponsorship.
            </p>
            <div style={{ paddingTop: 8 }}>
              <Link to="/citizen/problems">
                <Button variant="primary" size="small">
                  View Community Problem Feed →
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            <Badge variant="success">CSR Grant Consultation</Badge>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Custom Sponsorship Alignment
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', margin: 0, lineHeight: 1.5 }}>
              Need structured ESG milestone tracking, branded innovation awards, or multi-university hackathons? Connect with SamajX institutional coordinators.
            </p>
            <div style={{ paddingTop: 8 }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() =>
                  alert('Thank you for your interest! A SamajX Institutional Coordinator will contact your corporate affairs team.')
                }
              >
                Request Sponsorship Consultation
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
