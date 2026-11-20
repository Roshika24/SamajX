import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import JigglypuffMascot from '../../components/JigglypuffMascot';
import styles from './RegisterPage.module.css';
import { api } from '../../utils/api';
import LocationPicker from '../../components/LocationPicker';

const ROLES = [
  { value: 'citizen', label: 'Citizen', desc: 'Report local problems in your area' },
  { value: 'university_admin', label: 'University', desc: 'Register your university to host student teams' },
  { value: 'company', label: 'Company', desc: 'Sponsor student projects and solutions' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('citizen');
  const [form, setForm] = useState({ display_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [domains, setDomains] = useState([]);
  const [university, setUniversity] = useState({ name: '', address: '', city: '', state: '', country: 'India', lat: '', lng: '', website: '', departments: [] });
  const [company, setCompany] = useState({ name: '', description: '', website: '', industry: '' });
  useEffect(() => { api.get('/domains').then((r) => setDomains(r.data || [])).catch(() => {}); }, []);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, role };
      if (role === 'company') {
        payload.company = { ...company, website: company.website || undefined, description: company.description || undefined, industry: company.industry || undefined };
      }
      if (role === 'university_admin') {
        payload.university = { ...university, website: university.website || undefined, lat: Number(university.lat), lng: Number(university.lng), departments: university.departments };
      }
      const user = await register(payload);
      const routes = {
        citizen: '/citizen',
        university_admin: '/admin/university',
        company: '/company',
      };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card} padding="none">
        <div className={styles.headerArea}>
          <div className={styles.mascotWrap}>
            <JigglypuffMascot variant="idle" size="small" showShadow={false} />
          </div>
          <p className="eyebrow">COMMUNITY ONBOARDING</p>
          <h2 className={styles.title}>Create your account</h2>
          <p className={styles.subtitle}>Join SamajX and start building civic solutions</p>
        </div>

        {/* Role selector tabs */}
        <div className={styles.roleTabs}>
          {ROLES.map(r => (
            <button
              key={r.value}
              className={`${styles.roleTab} ${role === r.value ? styles.activeTab : ''}`}
              onClick={() => setRole(r.value)}
              type="button"
            >
              <strong>{r.label}</strong>
              <span>{r.desc}</span>
            </button>
          ))}
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="display_name">Full Name</label>
            <input
              id="display_name"
              name="display_name"
              value={form.display_name}
              onChange={handleChange}
              required
              placeholder="Your full name"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          {role === 'company' && <>
            <div className={styles.field}><label htmlFor="company-name">Company name</label><input id="company-name" value={company.name} onChange={(e) => setCompany(v => ({ ...v, name: e.target.value }))} required minLength={2} maxLength={255} /></div>
            <div className={styles.field}><label htmlFor="company-industry">Industry (optional)</label><input id="company-industry" value={company.industry} onChange={(e) => setCompany(v => ({ ...v, industry: e.target.value }))} maxLength={100} placeholder="e.g. Technology" /></div>
            <div className={styles.field}><label htmlFor="company-website">Website (optional)</label><input id="company-website" type="url" value={company.website} onChange={(e) => setCompany(v => ({ ...v, website: e.target.value }))} placeholder="https://example.com" /></div>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}><label htmlFor="company-description">About the company (optional)</label><textarea id="company-description" value={company.description} onChange={(e) => setCompany(v => ({ ...v, description: e.target.value }))} maxLength={5000} rows={3} /></div>
          </>}
          {role === 'university_admin' && <>
            <div className={styles.field}><label htmlFor="uni-name">University name</label><input id="uni-name" value={university.name} onChange={(e) => setUniversity(v => ({ ...v, name: e.target.value }))} required /></div>
            <div className={styles.field}><label htmlFor="uni-address">Campus address</label><input id="uni-address" value={university.address} onChange={(e) => setUniversity(v => ({ ...v, address: e.target.value }))} /></div>
            <div className={styles.field}><label htmlFor="uni-city">City</label><input id="uni-city" value={university.city} onChange={(e) => setUniversity(v => ({ ...v, city: e.target.value }))} required /></div>
            <div className={styles.field}><label htmlFor="uni-state">State</label><input id="uni-state" value={university.state} onChange={(e) => setUniversity(v => ({ ...v, state: e.target.value }))} required /></div>
            <div className={styles.field}><label htmlFor="uni-website">Website (optional)</label><input id="uni-website" type="url" value={university.website} onChange={(e) => setUniversity(v => ({ ...v, website: e.target.value }))} /></div>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}><label>Campus location pin</label>
              <LocationPicker latitude={university.lat} longitude={university.lng} onChange={(lat, lng) => setUniversity(v => ({ ...v, lat: String(lat), lng: String(lng) }))} />
              <input aria-label="Selected latitude" value={university.lat} readOnly required placeholder="Latitude will appear here after selecting the map" />
              <input aria-label="Selected longitude" value={university.lng} readOnly required placeholder="Longitude will appear here after selecting the map" />
            </div>
            <div className={styles.field}><label>Departments / domains</label><div style={{ display: 'grid', gap: 8 }}>{domains.map(d => <label key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={university.departments.some(x => x.domain_slug === d.slug)} onChange={(e) => setUniversity(v => ({ ...v, departments: e.target.checked ? [...v.departments, { domain_slug: d.slug, name: `Department of ${d.name}` }] : v.departments.filter(x => x.domain_slug !== d.slug) }))} />{d.name}</label>)}</div></div>
          </>}
          <Button type="submit" loading={loading} className={styles.submitBtn}>
            Create Account
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p className={styles.leaderNote}>
          Are you a student team leader? <Link to="/register/leader">Register with a promo code →</Link>
        </p>
      </Card>
    </div>
  );
}
