import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function LeaderCertificatesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/projects/certificates/mine')
      .then((r) => setItems(r.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            RECOGNITION & CREDENTIALS
          </span>
          <Badge variant="success">{items.length} Issued</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Team Impact Certificates
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Cryptographically verifiable certificates issued by participating universities upon successful completion of civic challenges.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <p role="status" style={{ color: 'var(--color-ink-muted)' }}>Loading credential records…</p>
        </div>
      ) : !items.length ? (
        <Card>
          <EmptyState
            title="No Certificates Issued Yet"
            message="Your university will generate tamper-proof credentials once your team's civic project completion report is approved."
            actionText="View Active Projects"
            onAction={() => window.location.href = '/leader/projects'}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {items.map((c) => (
            <Card key={c.id}>
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Certificate Visual Badge Header */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 28 }}>🏅</span>
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd', fontWeight: 700 }}>
                        CIVIC MERIT CREDENTIAL
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: '#cbd5e1' }}>
                        {c.university_name}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success">VERIFIED</Badge>
                </div>

                {/* Recipient & Project */}
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Awarded To
                  </span>
                  <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '2px 0 8px 0' }}>
                    {c.member_name}
                  </h3>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)', fontWeight: 600, lineHeight: 1.4 }}>
                    {c.problem_title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginTop: 4 }}>
                    Squad: <strong>{c.team_name}</strong>
                  </div>
                </div>

                {/* Verification Code Box */}
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-surface-sunken)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--text-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--color-ink-muted)' }}>Code:</span>
                  <code style={{ fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
                    {c.verification_code}
                  </code>
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                  Issued: {new Date(c.issued_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                  <a
                    href={`/api/projects/certificates/${c.verification_code}/pdf`}
                    style={{ textDecoration: 'none', flex: 1 }}
                  >
                    <Button variant="primary" size="small" style={{ width: '100%' }}>
                      📥 Download PDF
                    </Button>
                  </a>
                  <a
                    href={`/verify/${c.verification_code}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', flex: 1 }}
                  >
                    <Button variant="secondary" size="small" style={{ width: '100%' }}>
                      Verify Online ↗
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
