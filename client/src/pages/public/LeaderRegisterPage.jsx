import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RegisterPage.module.css';

export default function LeaderRegisterPage() {
  const { registerLeader } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: '', email: '', password: '', promo_code: '', enrollment_number: '', branch: '', year: '1' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      await registerLeader({ ...form, year: Number(form.year), promo_code: form.promo_code.trim().toUpperCase() });
      navigate('/leader');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card} padding="none">
        <div className={styles.headerArea}>
          <p className="eyebrow">ACADEMIC INNOVATION · STUDENT HUB</p>
          <h2 className={styles.title}>Register as Team Leader</h2>
          <p className={styles.subtitle}>
            Enter your university's active promo code to join the university roster and start building solutions with your student crew.
          </p>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <form onSubmit={submit} className={styles.form}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div className={styles.field}>
              <label htmlFor="display_name">Full Name</label>
              <input id="display_name" name="display_name" type="text" value={form.display_name} onChange={change} required placeholder="Student Leader Name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="email">University Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={change} required placeholder="student@university.edu" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div className={styles.field}>
              <label htmlFor="password">Password (8+ characters)</label>
              <input id="password" name="password" type="password" value={form.password} onChange={change} required minLength={8} placeholder="••••••••" />
            </div>
            <div className={styles.field}>
              <label htmlFor="promo_code">University Promo Code</label>
              <input id="promo_code" name="promo_code" type="text" value={form.promo_code} onChange={change} required placeholder="e.g. UNI-ENG-2025" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
            <div className={styles.field}>
              <label htmlFor="enrollment_number">Enrollment / Roll No.</label>
              <input id="enrollment_number" name="enrollment_number" type="text" value={form.enrollment_number} onChange={change} required placeholder="e.g. 21BCE0456" />
            </div>
            <div className={styles.field}>
              <label htmlFor="branch">Department / Branch</label>
              <input id="branch" name="branch" type="text" value={form.branch} onChange={change} required placeholder="e.g. Computer Engineering" />
            </div>
            <div className={styles.field}>
              <label htmlFor="year">Current Year</label>
              <select id="year" name="year" value={form.year} onChange={change}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>Year {n}</option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" loading={loading} className={styles.submitBtn}>
            Create Leader Account
          </Button>
        </form>

        <p className={styles.footer}>
          Already registered? <Link to="/login">Sign in here</Link>
        </p>
      </Card>
    </div>
  );
}
