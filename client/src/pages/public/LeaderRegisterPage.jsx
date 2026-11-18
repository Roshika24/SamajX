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

  return <div className={styles.page}>
    <Card className={styles.card} variant="elevated">
      <p className="eyebrow">CIVICPULSE · TEAM LEADERS</p>
      <h2 className={styles.title}>Bring your team to the <span style={{ color: 'var(--color-purple)' }}>starting line.</span></h2>
      <p className={styles.subtitle}>Use your university's active promo code. Your university admin will approve your account before you can create a team.</p>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <form onSubmit={submit} className={styles.form}>
        {[['display_name','Full name','text'],['email','University email','email'],['password','Password (8+ characters)','password'],['promo_code','University promo code','text'],['enrollment_number','Enrollment number','text'],['branch','Branch / department','text']].map(([name,label,type]) => <div className={styles.field} key={name}>
          <label htmlFor={name}>{label}</label><input id={name} name={name} type={type} value={form[name]} onChange={change} required minLength={name === 'password' ? 8 : undefined} />
        </div>)}
        <div className={styles.field}><label htmlFor="year">Current year</label><select id="year" name="year" value={form.year} onChange={change}>{[1,2,3,4,5,6].map((n) => <option key={n} value={n}>Year {n}</option>)}</select></div>
        <Button type="submit" loading={loading} className={styles.submitBtn}>Create leader account</Button>
      </form>
      <p className={styles.footer}>Already registered? <Link to="/login">Log in</Link></p>
    </Card>
  </div>;
}
