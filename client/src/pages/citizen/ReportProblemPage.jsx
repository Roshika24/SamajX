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

  return <div style={{ display: 'grid', gap: 20, maxWidth: 900 }}>
    <header><p className="eyebrow">CITIZEN · REPORT</p><h1>Report a civic problem</h1><p style={{ color: 'var(--color-ink-muted)' }}>Describe the issue and pin its exact location. Your report helps nearby communities understand what needs attention.</p></header>
    {error && <Card><p role="alert" style={{ color: 'var(--color-danger, #b42318)', margin: 0 }}>{error}</p></Card>}
    {result && <Card><h3>Report submitted</h3>
      {result.duplicate?.band === 'high' && <p>Your report was matched to an existing problem: <strong>{result.duplicate.candidate.title}</strong>. It has been added to that problem.</p>}
      {result.duplicate?.band === 'medium' && <p>We found a possible match: <strong>{result.duplicate.candidate.title}</strong>. You can confirm or reject it from My Reports.</p>}
      {!result.duplicate && <p>A new civic problem has been created.</p>}
      <Button onClick={() => navigate('/citizen/reports')}>View my reports</Button>
    </Card>}
    <Card padding="lg">
      <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
        <div><label htmlFor="report-title">Problem title</label><input id="report-title" required minLength={8} maxLength={500} value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Large pothole near the bus stop" style={fieldStyle} /></div>
        <div><label htmlFor="report-description">Describe what happened</label><textarea id="report-description" required minLength={20} maxLength={5000} rows={5} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Explain the issue, how long it has been there, and who is affected…" style={fieldStyle} /></div>
        <div><label htmlFor="report-category">Category / domain</label><select id="report-category" required value={form.category} onChange={(e) => update('category', e.target.value)} style={fieldStyle}><option value="">Choose a category</option>{domains.map((domain) => <option key={domain.id} value={domain.slug}>{domain.name}</option>)}</select></div>
        <section><h3>Pin the location</h3><p style={{ color: 'var(--color-ink-muted)' }}>Click the map where the problem is located.</p><LocationPicker latitude={form.lat} longitude={form.lng} onChange={(lat, lng) => { update('lat', String(lat)); update('lng', String(lng)); }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}><input aria-label="Latitude" readOnly required value={form.lat} placeholder="Latitude" style={fieldStyle} /><input aria-label="Longitude" readOnly required value={form.lng} placeholder="Longitude" style={fieldStyle} /></div>
        </section>
        <section><h3>Photos (optional)</h3><p style={{ color: 'var(--color-ink-muted)' }}>Upload up to five JPEG/PNG photos (5 MB each) or add HTTPS image links. Uploaded JPEG/PNG metadata, including EXIF GPS, is stripped before storage.</p>
          <input aria-label="Upload photos" type="file" accept="image/jpeg,image/png" multiple onChange={(e) => { const selected = Array.from(e.target.files || []); if (selected.length + form.photos.length > 5) { setError('You can add up to 5 photos in total'); return; } if (selected.some((file) => file.size > 5 * 1024 * 1024)) { setError('Each photo must be 5 MB or smaller'); return; } setPhotoFiles(selected); setError(''); }} />
          {photoFiles.map((file) => <p key={`${file.name}-${file.size}`} style={{ margin: 0 }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>)}
          <div style={{ display: 'flex', gap: 8 }}><input type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…/photo.jpg" style={{ ...fieldStyle, flex: 1 }} /><Button type="button" variant="secondary" onClick={addPhoto}>Add link</Button></div>
          {form.photos.map((url, index) => <div key={url} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: 8, background: 'var(--color-gray-50)', borderRadius: 8 }}><span style={{ overflowWrap: 'anywhere' }}>{url}</span><button type="button" onClick={() => update('photos', form.photos.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}>Remove</button></div>)}
        </section>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={form.anonymous} onChange={(e) => update('anonymous', e.target.checked)} /> Submit anonymously (your identity remains available to authorized moderators)</label>
        <Button type="submit" loading={loading} disabled={loading || !form.lat || !form.lng}>Submit report</Button>
      </form>
    </Card>
  </div>;
}

const fieldStyle = { display: 'block', width: '100%', padding: '12px 14px', border: '1px solid var(--color-gray-300, #d0d5dd)', borderRadius: 10, marginTop: 7, background: 'white' };
