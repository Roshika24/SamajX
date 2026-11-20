import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        <h1 className={styles.headline}>
          Report it. <span className={styles.accent}>Solve it.</span> Together.
        </h1>
        <p className={styles.subtext}>
          SamajX connects citizens with university teams to tackle local
          problems — from potholes to public health.
        </p>
        <div className={styles.cta}>
          <Link to="/register" className={styles.primaryBtn}>Get Started</Link>
          <Link to="/login" className={styles.secondaryBtn}>Log In</Link>
        </div>
      </div>
    </div>
  );
}
