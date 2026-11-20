import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import LocationPicker from '../../components/LocationPicker';
import { api } from '../../utils/api';

const initial = { title: '', description: '', category: '', lat: '', lng: '', anonymous: false, photos: [] };

export default function ReportProblemPage() {
  const [form, setForm] = useState(initial);
  const [domains, setDomains] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.get('/domains').then((r) => setDomains(r.data || [])).catch((e) => setError(e.message)); }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault(); setError(''); setResult(null); setLoading(true);
    try {
      const uploaded = [];
      for (const file of photoFiles) { const upload = await api.uploadImage(file); uploaded.push(upload.data.url); }
      const payload = { ...form, photos: [...form.photos, ...uploaded], lat: Number(form.lat), lng: Number(form.lng) };
      const response = await api.post('/reports', payload);
      setResult(response.data);
      setForm(initial); setPhotoFiles([]);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function addPhoto() {
    const value = photoUrl.trim();
    if (!/^https:\/\//i.test(value)) { setError('Photo links must start with https://'); return; }
    if (form.photos.length + photoFiles.length >= 5) { setError('You can add up to 5 photo links'); return; }
    update('photos', [...form.photos, value]); setPhotoUrl(''); setError('');
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)', maxWidth: 860, margin: '0 auto' }}>
      <header>
        <p className="eyebrow">CITIZEN INITIATIVE · REPORT PROBLEM</p>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, margin: '0 0 var(--space-2) 0' }}>Report a Civic Issue</h1>
        <p style={{ color: 'var(--color-ink-muted)', margin: 0, fontSize: 'var(--text-sm)', lineHeight: 'var(--line-relaxed)' }}>
          Pin the problem on the map, provide details, and submit evidence. Your report will be automatically triaged and routed to nearby university engineering teams.
        </p>
      </header>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: '14px 18px', borderRadius: 'var(--radius-lg)', color: 'var(--color-danger-text)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <Card style={{ padding: 'var(--space-6)', border: '2px solid var(--color-success)', background: '#F0FDF4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-3)' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</span>
            <h3 style={{ margin: 0, color: 'var(--color-success-text)' }}>Report Successfully Submitted</h3>
          </div>

          {result.duplicate?.band === 'high' && (
            <p style={{ color: '#166534', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4) 0' }}>
              Your report was matched with high confidence to existing problem: <strong>"{result.duplicate.candidate.title}"</strong> and has been merged into that community tracking thread.
            </p>
          )}

          {result.duplicate?.band === 'medium' && (
            <p style={{ color: '#166534', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4) 0' }}>
              We identified a potential match: <strong>"{result.duplicate.candidate.title}"</strong>. You can verify or dispute this match anytime from <em>My Reports</em>.
            </p>
          )}

          {!result.duplicate && (
            <p style={{ color: '#166534', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4) 0' }}>
              A new community problem record has been created and will appear on the local civic map shortly.
            </p>
          )}

          <Button variant="primary" onClick={() => navigate('/citizen/reports')}>
            View My Reports →
          </Button>
        </Card>
      )}

      <Card style={{ padding: 'var(--space-8)' }}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* Section 1: Details */}
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', margin: '0 0 var(--space-4) 0', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-gray-200)' }}>
              1. Issue Details
            </h3>

            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <label htmlFor="report-title" style={labelStyle}>
                  Problem Title <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="report-title"
                  required
                  minLength={8}
                  maxLength={500}
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. Hazardous pothole cluster near Central Bus Station"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="report-category" style={labelStyle}>
                  Domain / Category <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  id="report-category"
                  required
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select a civic domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.slug}>
                      {domain.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-description" style={labelStyle}>
                  Detailed Description <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                  id="report-description"
                  required
                  minLength={20}
                  maxLength={5000}
                  rows={4}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Describe the issue in detail, how long it has persisted, who is affected, and any safety hazards…"
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>Minimum 20 characters</span>
              </div>
            </div>
          </div>

          {/* Section 2: Location */}
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', margin: '0 0 var(--space-2) 0', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-gray-200)' }}>
              2. Precise Location <span style={{ color: 'var(--color-danger)' }}>*</span>
            </h3>
            <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-xs)', margin: '0 0 var(--space-3) 0' }}>
              Click on the map to pinpoint the exact location of the civic problem.
            </p>

            <LocationPicker
              latitude={form.lat}
              longitude={form.lng}
              onChange={(lat, lng) => {
                update('lat', String(lat));
                update('lng', String(lng));
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              <div>
                <label style={labelStyle}>Selected Latitude</label>
                <input
                  aria-label="Latitude"
                  readOnly
                  required
                  value={form.lat}
                  placeholder="Click map to set"
                  style={{ ...inputStyle, background: 'var(--color-gray-50)', color: 'var(--color-gray-700)' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Selected Longitude</label>
                <input
                  aria-label="Longitude"
                  readOnly
                  required
                  value={form.lng}
                  placeholder="Click map to set"
                  style={{ ...inputStyle, background: 'var(--color-gray-50)', color: 'var(--color-gray-700)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Evidence */}
          <div>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', margin: '0 0 var(--space-2) 0', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-gray-200)' }}>
              3. Photo Evidence (Optional)
            </h3>
            <p style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-xs)', margin: '0 0 var(--space-3) 0' }}>
              Upload up to 5 photos (max 5 MB each, JPEG/PNG). EXIF GPS metadata is automatically stripped before saving for privacy.
            </p>

            <div style={{
              border: '2px dashed var(--color-gray-300)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-5)',
              textAlign: 'center',
              background: 'var(--color-gray-50)',
              marginBottom: 'var(--space-3)'
            }}>
              <input
                aria-label="Upload photos"
                type="file"
                accept="image/jpeg,image/png"
                multiple
                id="file-upload"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  if (selected.length + form.photos.length > 5) {
                    setError('You can add up to 5 photos in total');
                    return;
                  }
                  if (selected.some((file) => file.size > 5 * 1024 * 1024)) {
                    setError('Each photo must be 5 MB or smaller');
                    return;
                  }
                  setPhotoFiles(selected);
                  setError('');
                }}
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
                <div style={{ color: 'var(--color-primary)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                  📁 Click to select photos from device
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                  PNG or JPEG up to 5MB each
                </div>
              </label>
            </div>

            {/* Selected File Chips */}
            {photoFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                {photoFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} style={{ fontSize: '0.8rem', background: '#EFF6FF', color: 'var(--color-primary)', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: 6 }}>
                    📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                ))}
              </div>
            )}

            {/* Photo Link Input */}
            <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-2)' }}>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Or add an HTTPS image link: https://example.com/photo.jpg"
                style={{ ...inputStyle, flex: 1 }}
              />
              <Button type="button" variant="secondary" onClick={addPhoto}>
                Add Link
              </Button>
            </div>

            {/* Attached Photo URLs */}
            {form.photos.map((url, index) => (
              <div key={url} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-gray-50)', borderRadius: 8, marginTop: 8, border: '1px solid var(--color-gray-200)', fontSize: '0.8rem' }}>
                <span style={{ overflowWrap: 'anywhere' }}>🔗 {url}</span>
                <button
                  type="button"
                  onClick={() => update('photos', form.photos.filter((_, i) => i !== index))}
                  style={{ color: 'var(--color-danger)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Section 4: Privacy & Submit */}
          <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: 'var(--space-4)' }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', marginBottom: 'var(--space-5)' }}>
              <input
                type="checkbox"
                checked={form.anonymous}
                onChange={(e) => update('anonymous', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                <strong>Submit anonymously</strong> (your public profile will not be linked to this report)
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || !form.lat || !form.lng || !form.title || !form.category}
              style={{ width: '100%' }}
            >
              {loading ? 'Submitting Civic Report…' : 'Submit Civic Report'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--weight-semibold)',
  color: 'var(--color-gray-700)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '0.35rem'
};

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  border: '1px solid var(--color-gray-300)',
  borderRadius: 'var(--radius-lg)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-gray-900)',
  background: 'white',
  transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)'
};

