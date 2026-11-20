import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Citizens Report',
    desc: 'Pin hyper-local civic issues on OpenStreetMap, attach photos, and choose optional anonymity. Automatic text matching prevents duplicate reports.',
    tag: 'Community',
    badge: 'Citizen Space',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'AI Triage & Department Routing',
    desc: 'Automated AI analyzes problem descriptions, suggests difficulty levels, and routes challenges to nearby universities with matching engineering departments.',
    tag: 'Intelligence',
    badge: 'AI & Routing',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Student Teams Claim & Build',
    desc: 'University student crews submit structured proposals, assemble interdisciplinary expertise, log verified milestones, and develop real-world prototypes.',
    tag: 'Execution',
    badge: 'Student Teams',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    step: '04',
    title: 'University Sign-off & Certificates',
    desc: 'Universities review final deliverables and proof artifacts. Approved completions generate tamper-proof cryptographic student certificates with public verification.',
    tag: 'Verification',
    badge: 'Certificates',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

const CIVIC_DOMAINS = [
  { name: 'Roads & Infrastructure', icon: '🛣️', desc: 'Potholes, broken signals, dangerous crossings, speed breaker needs' },
  { name: 'Water & Sanitation', icon: '🚰', desc: 'Contaminated pipelines, drain overflows, stagnant water hazards' },
  { name: 'Solid Waste Management', icon: '♻️', desc: 'Overflowing dumpsters, illegal dumping, plastic collection deficits' },
  { name: 'Public Health & Safety', icon: '🏥', desc: 'Mosquito breeding hotspots, streetlight blackouts, missing railings' },
  { name: 'Environmental Resilience', icon: '🌱', desc: 'Green space restoration, air quality monitoring, park maintenance' },
  { name: 'Civic Accessibility', icon: '♿', desc: 'Ramp access, tactile paving, footpaths, barrier-free public facilities' },
];

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className={styles.landingWrapper}>
      {/* ── 1. HERO SECTION ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroMain}>
            <div className={styles.eyebrowBadge}>
              <span className={styles.eyebrowDot} />
              Empowering Civic Innovation & Academic Action
            </div>
            <h1 className={styles.heroHeadline}>
              Local Problems Meet <span className={styles.heroGradient}>University Solutions.</span>
            </h1>
            <p className={styles.heroSubtext}>
              SamajX connects citizens who report local issues with student engineering teams who build verified, real-world solutions — certified by universities with full transparency.
            </p>
            <div className={styles.heroCtas}>
              <Link to="/register" className={styles.primaryCta}>
                Report an Issue
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <Link to="/register/leader" className={styles.secondaryCta}>
                Student Leader Signup
              </Link>
              <Link to="/login" className={styles.ghostCta}>
                Explore Problem Feed →
              </Link>
            </div>

            <div className={styles.trustBadges}>
              <div className={styles.trustItem}>
                <span className={styles.trustCheck}>✓</span>
                <span>Cryptographic Certificates</span>
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustCheck}>✓</span>
                <span>OpenStreetMap Verified</span>
              </div>
              <div className={styles.trustItem}>
                <span className={styles.trustCheck}>✓</span>
                <span>EXIF GPS Privacy Protected</span>
              </div>
            </div>
          </div>

          {/* Interactive Hero Card Preview */}
          <div className={styles.heroGraphic}>
            <div className={styles.cardPreviewShell}>
              <div className={styles.cardPreviewHeader}>
                <div className={styles.previewDotGroup}>
                  <span className={styles.dotRed} />
                  <span className={styles.dotYellow} />
                  <span className={styles.dotGreen} />
                </div>
                <span className={styles.previewHeaderTitle}>Live Civic Pipeline</span>
                <span className={styles.previewLiveBadge}>Active Hub</span>
              </div>

              <div className={styles.previewBody}>
                <div className={styles.previewStepBar}>
                  <span className={styles.stepIndicatorActive}>1. Report</span>
                  <span className={styles.stepArrow}>→</span>
                  <span className={styles.stepIndicatorActive}>2. AI Route</span>
                  <span className={styles.stepArrow}>→</span>
                  <span className={styles.stepIndicatorActive}>3. Build</span>
                  <span className={styles.stepArrow}>→</span>
                  <span className={styles.stepIndicatorDone}>4. Verify</span>
                </div>

                <div className={styles.problemPreviewCard}>
                  <div className={styles.problemPreviewTop}>
                    <span className={styles.domainTag}>ROADS & INFRASTRUCTURE</span>
                    <span className={styles.statusPill}>IN PROGRESS</span>
                  </div>
                  <h3 className={styles.problemPreviewTitle}>Dangerous Pothole Cluster on Campus Access Road</h3>
                  <p className={styles.problemPreviewDesc}>
                    Large road depressions causing traffic bottleneck and accident risks for two-wheelers during monsoon rains.
                  </p>
                  <div className={styles.problemPreviewFooter}>
                    <div className={styles.teamAssignee}>
                      <span className={styles.teamAvatar}>TG</span>
                      <span>The Groundbreakers (Civil & IoT)</span>
                    </div>
                    <span className={styles.xpBadge}>+3.5 XP Verified</span>
                  </div>
                </div>

                <div className={styles.previewVerificationCard}>
                  <div className={styles.verifiedIconWrap}>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="#10B981">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <strong>University Certified Completion</strong>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B' }}>
                      Cryptographic SHA-256 certificate issued to student team members.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. VISUAL 4-STAGE JOURNEY ── */}
      <section className={styles.journeySection} id="how-it-works">
        <div className={styles.sectionHeader}>
          <p className="eyebrow">TRANSPARENT LIFECYCLE</p>
          <h2 className={styles.sectionTitle}>How SamajX Solves Civic Challenges</h2>
          <p className={styles.sectionSubtitle}>
            A structured, accountable pipeline from the moment a problem is spotted to verified student solution delivery.
          </p>
        </div>

        <div className={styles.workflowGrid}>
          {WORKFLOW_STEPS.map((s, index) => (
            <div
              key={s.step}
              className={`${styles.workflowCard} ${activeStep === index ? styles.workflowCardActive : ''}`}
              onMouseEnter={() => setActiveStep(index)}
            >
              <div className={styles.workflowCardTop}>
                <span className={styles.workflowNumber}>{s.step}</span>
                <span className={styles.workflowTag}>{s.tag}</span>
              </div>
              <div className={styles.workflowIconBox}>
                {s.icon}
              </div>
              <h3 className={styles.workflowTitle}>{s.title}</h3>
              <p className={styles.workflowDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. CIVIC DOMAINS ── */}
      <section className={styles.domainsSection}>
        <div className={styles.sectionHeader}>
          <p className="eyebrow">COMMUNITY SCOPE</p>
          <h2 className={styles.sectionTitle}>Civic Domains Addressed</h2>
          <p className={styles.sectionSubtitle}>
            Student engineering and design teams tackle real municipal and community challenges across high-impact categories.
          </p>
        </div>

        <div className={styles.domainsGrid}>
          {CIVIC_DOMAINS.map(d => (
            <div key={d.name} className={styles.domainCard}>
              <span className={styles.domainIcon}>{d.icon}</span>
              <h3 className={styles.domainName}>{d.name}</h3>
              <p className={styles.domainDesc}>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. STAKEHOLDER PATHWAYS ── */}
      <section className={styles.stakeholdersSection}>
        <div className={styles.sectionHeader}>
          <p className="eyebrow">COLLABORATIVE ECOSYSTEM</p>
          <h2 className={styles.sectionTitle}>Built for Everyone in the Civic Circle</h2>
          <p className={styles.sectionSubtitle}>
            Four distinct spaces designed specifically for citizens, students, universities, and industry.
          </p>
        </div>

        <div className={styles.stakeholdersGrid}>
          <div className={styles.stakeholderCard}>
            <div className={styles.stakeholderBadge}>CITIZENS</div>
            <h3>Voice What Matters</h3>
            <p>Pin local issues, follow community problems, view live resolution updates, and upvote priorities without bureaucratic delays.</p>
            <Link to="/register" className={styles.stakeholderLink}>Report as Citizen →</Link>
          </div>

          <div className={styles.stakeholderCard}>
            <div className={styles.stakeholderBadge}>STUDENT TEAMS</div>
            <h3>Build Real Portfolio Solutions</h3>
            <p>Claim real civic challenges, collaborate with faculty mentors, earn verified XP, and receive tamper-proof cryptographic certificates.</p>
            <Link to="/register/leader" className={styles.stakeholderLink}>Join with University Code →</Link>
          </div>

          <div className={styles.stakeholderCard}>
            <div className={styles.stakeholderBadge}>UNIVERSITIES</div>
            <h3>Showcase Institutional Impact</h3>
            <p>Review student leaders, verify member credentials, assess AI difficulty predictions, and certify completed community deliverables.</p>
            <Link to="/register" className={styles.stakeholderLink}>Register University →</Link>
          </div>

          <div className={styles.stakeholderCard}>
            <div className={styles.stakeholderBadge}>COMPANIES & CSR</div>
            <h3>Sponsor Measurable Solutions</h3>
            <p>Direct CSR resources directly into verified student projects, support local civic outcomes, and recruit proven problem-solvers.</p>
            <Link to="/register" className={styles.stakeholderLink}>Partner with Us →</Link>
          </div>
        </div>
      </section>

      {/* ── 5. FINAL CALL TO ACTION ── */}
      <section className={styles.ctaBannerSection}>
        <div className={styles.ctaBannerCard}>
          <h2 className={styles.ctaHeadline}>Ready to Bring Real Solutions to Your Community?</h2>
          <p className={styles.ctaSubtext}>
            Join thousands of active citizens and student problem-solvers on SamajX. Whether reporting an issue or building a prototype, your contribution counts.
          </p>
          <div className={styles.ctaButtonGroup}>
            <Link to="/register" className={styles.ctaWhiteBtn}>Create Account</Link>
            <Link to="/login" className={styles.ctaOutlineBtn}>Sign in to Dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

