import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import JigglypuffMascot from '../../components/JigglypuffMascot';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const routes = {
        citizen: '/citizen',
        leader: '/leader',
        university_admin: '/admin/university',
        company: '/company',
        platform_admin: '/admin/platform',
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
          <p className="eyebrow">PORTAL AUTHENTICATION</p>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>Sign in to your SamajX civic workspace</p>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" loading={loading} className={styles.submitBtn}>
            Sign In
          </Button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account? <Link to="/register">Create one</Link> · <Link to="/register/leader">Student code signup</Link>
        </p>

        <div className={styles.roleHint}>
          Supports Citizen · Student Leader · University Admin · Company · Platform Admin
        </div>
      </Card>
    </div>
  );
}
