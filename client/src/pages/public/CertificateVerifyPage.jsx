import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';

export default function CertificateVerifyPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/certificates/verify/${code}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || 'Certificate not found or invalid');
        return j.data;
      })
      .then((res) => {
        setData(res);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <main style={{ maxWidth: 760, margin: '40px auto 60px', padding: '0 16px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-ink-muted)' }}>
          ← Back to SamajX Home
        </Link>
      </div>

      <Card style={{ padding: 32, border: '1px solid var(--color-gray-200)', boxShadow: 'var(--shadow-xl)', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--color-gray-200)', paddingBottom: 20, marginBottom: 24 }}>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 6px 0' }}>SamajX · PUBLIC VERIFICATION REGISTRY</p>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>Certificate Verification</h1>
          </div>
          {data && (
            <Badge variant="success" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              ✓ Authenticated Record
            </Badge>
          )}
        </div>

        {error && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: 18, borderRadius: 12, color: 'var(--color-danger-text)' }}>
            <h3 style={{ margin: '0 0 4px', color: 'inherit' }}>Certificate Not Found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-ink-muted)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--color-primary-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <p>Querying tamper-proof registry for code: <code>{code}</code>…</p>
          </div>
        )}

        {data && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* Certificate Preview Box */}
            <div style={{
              background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
              border: '2px solid #E2E8F0',
              borderRadius: 16,
              padding: '28px 24px',
              position: 'relative',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '1px dashed #CBD5E1', paddingBottom: 18 }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-primary)', fontWeight: 700 }}>
                  National Civic Innovation Credential
                </span>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--color-ink)', margin: '8px 0 4px', fontWeight: 800 }}>
                  {data.certificate.member_name}
                </h2>
                <p style={{ color: 'var(--color-ink-muted)', margin: 0, fontSize: '0.9rem' }}>
                  Has successfully resolved a certified community challenge on SamajX
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Project / Challenge</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginTop: 2 }}>{data.certificate.problem_title}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Student Crew</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginTop: 2 }}>{data.certificate.team_name}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Certifying University</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginTop: 2 }}>{data.certificate.university_name}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Solution Delivery Type</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginTop: 2, textTransform: 'capitalize' }}>
                    {(data.certificate.solution_type || 'General').replaceAll('_', ' ')}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Issued Timestamp</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginTop: 2 }}>
                    {new Date(data.certificate.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Cryptographic Verification Code</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-primary-hover)', marginTop: 2, wordBreak: 'break-all' }}>
                    {data.certificate.verification_code}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href={`/api/projects/certificates/${code}/pdf`}
                className="btn-download"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'var(--color-primary)',
                  color: 'white',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download Official Certificate (PDF)
              </a>

              <Button variant="secondary" onClick={() => window.print()}>
                Print Credential
              </Button>
            </div>

            <div style={{ background: 'var(--color-gray-50)', padding: 14, borderRadius: 10, fontSize: '0.8rem', color: 'var(--color-gray-500)', lineHeight: 1.5 }}>
              🛡️ <strong>Tamper-Proof Verification Notice:</strong> This digital credential is authenticated directly against SamajX's permanent database registry. The issuer is the authorized university administrator responsible for certifying that the student completed all required milestone deliverables.
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}

