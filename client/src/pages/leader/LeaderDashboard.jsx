import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import JigglypuffMascot from '../../components/JigglypuffMascot';
import PixelMeadowBg from '../../components/PixelMeadowBg';
import styles from './LeaderDashboard.module.css';

const initialMember = { name: '', email: '', enrollment_number: '', branch: '', year: '1', speciality: '', interests: '' };
const initialEvidence = { type: 'project', title: '', description: '', link: '', faculty_name: '' };

export default function LeaderDashboard() {
  const [profile, setProfile] = useState(null);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [member, setMember] = useState(initialMember);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [evidenceMember, setEvidenceMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [expertise, setExpertise] = useState({ branch: '', speciality: '', interests: '' });

  // Real data state
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [problems, setProblems] = useState([]);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get('/leaders/me');
      setProfile(result.data.leader);
      setTeam(result.data.team);

      const [detailRes, probRes, projRes, appRes, certRes] = await Promise.allSettled([
        result.data.team ? api.get(`/teams/${result.data.team.id}`) : Promise.resolve({ data: null }),
        api.get('/applications/problems').catch(() => ({ data: [] })),
        api.get('/projects/mine').catch(() => ({ data: [] })),
        api.get('/applications/mine').catch(() => ({ data: [] })),
        api.get('/projects/certificates/mine').catch(() => ({ data: [] })),
      ]);

      if (detailRes.status === 'fulfilled' && detailRes.value?.data) {
        setTeam(detailRes.value.data);
      }
      if (probRes.status === 'fulfilled') setProblems(probRes.value?.data || []);
      if (projRes.status === 'fulfilled') setProjects(projRes.value?.data || []);
      if (appRes.status === 'fulfilled') setApplications(appRes.value?.data || []);
      if (certRes.status === 'fulfilled') setCertificates(certRes.value?.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createTeam(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/teams', { name: teamName });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/teams/${team.id}/members`, {
        ...member,
        email: member.email || undefined,
        year: Number(member.year),
      });
      setMember(initialMember);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveExpertise(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.patch(`/teams/${team.id}/members/${editingMember}`, expertise);
      setEditingMember(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/members/${evidenceMember}/evidence`, {
        ...evidence,
        link: evidence.link || undefined,
      });
      setEvidence(initialEvidence);
      setEvidenceMember(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Derive current primary active project
  const activeProject =
    projects.find((p) => ['active', 'submitted_for_review'].includes(p.status)) ||
    projects[0] ||
    null;

  // Calculate project progress percentage based on milestones
  const milestonesList = activeProject?.milestones || [];
  const completedMilestones = milestonesList.filter((m) => m.status === 'completed' || m.completed).length;
  const totalMilestones = milestonesList.length;

  let progressPercent = 0;
  if (activeProject?.status === 'completed') {
    progressPercent = 100;
  } else if (activeProject?.status === 'submitted_for_review') {
    progressPercent = 90;
  } else if (totalMilestones > 0) {
    progressPercent = Math.min(85, Math.round((completedMilestones / totalMilestones) * 80) + 15);
  } else if (activeProject?.status === 'active') {
    progressPercent = 25;
  }

  if (loading && !profile) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 340, textAlign: 'center', gap: 16 }}>
        <JigglypuffMascot variant="thinking" size="medium" speech="Jigglypuff is preparing your workspace…" />
        <p style={{ color: 'var(--jiggly-text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Loading your student adventure…
        </p>
      </div>
    );
  }

  return (
    <PixelMeadowBg>
      <div className={styles.dashboardWrapper}>
        {/* ── 1. WELCOME HERO SECTION (POKÉMON JIGGLYPUFF THEME) ── */}
        <section className={styles.welcomeHeroCard}>
          <div className={styles.welcomeHeroLeft}>
            <div className={styles.trainerBadgeRow}>
              <span className={styles.trainerPill}>
                <span>🌟</span>
                <span>TRAINER LEVEL: {profile?.verified ? 'VERIFIED SQUAD' : 'ROOKIE SQUAD'}</span>
              </span>
              <Badge variant="primary">{team?.name || 'No Squad Formed'}</Badge>
            </div>

            <h1 className={styles.welcomeTitle}>
              Welcome back, <span className={styles.welcomeTitleHighlight}>{profile?.display_name || 'Trainer'}!</span> 👋
            </h1>

            <p className={styles.welcomeSubtitle}>
              Your next great engineering breakthrough starts with one small step. Tackle real civic problems and create verified community impact.
            </p>

            <div className={styles.welcomeHeroMeta}>
              <span className={styles.metaItem}>
                <span>🏫</span>
                <span>{profile?.university_name || 'Delhi Technological University'}</span>
              </span>
              <span className={styles.metaItem}>
                <span>👥</span>
                <span>{team?.members?.length || 0} Squad Members</span>
              </span>
              <span className={styles.metaItem}>
                <span>🏆</span>
                <span>{certificates.length} Certified Badges</span>
              </span>
            </div>
          </div>

          <div className={styles.welcomeHeroRight}>
            <JigglypuffMascot
              variant={certificates.length > 0 ? 'celebrate' : 'trainer'}
              size="large"
              speech="Ready for our next civic quest?"
            />
          </div>
        </section>

        {/* Global Error Notice */}
        {error && (
          <div
            role="alert"
            style={{
              padding: '14px 18px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-lg)',
              color: '#991B1B',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* University Approval Pending Notice */}
        {profile?.status !== 'approved' && (
          <div
            style={{
              background: '#FFFBEB',
              border: '2px solid #FDE68A',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              display: 'flex',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <JigglypuffMascot variant="sleeping" size="medium" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Badge variant="warning">Verification Pending</Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                  Status: {profile?.status || 'pending'}
                </span>
              </div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--jiggly-text)' }}>
                Account Under University Verification
              </h2>
              <p style={{ color: 'var(--jiggly-text-muted)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: 1.5 }}>
                Your university admin ({profile?.university_name || 'Campus Administrator'}) is validating your student credentials. Once approved, you will be able to apply for open civic problems with your squad.
              </p>
            </div>
          </div>
        )}

        {/* ── 2. QUICK ACTIONS TILES ── */}
        <section>
          <div className={styles.quickActionsGrid}>
            <Link to="/leader/problems" className={styles.actionTile}>
              <div className={styles.actionIconBox} style={{ background: '#EFF6FF', color: '#2563EB' }}>
                🔍
              </div>
              <div>
                <div className={styles.actionTitle}>Browse Problems</div>
                <div className={styles.actionSubtext}>{problems.length} open challenges</div>
              </div>
            </Link>

            <Link to="/leader/projects" className={styles.actionTile}>
              <div className={styles.actionIconBox} style={{ background: '#ECFDF5', color: '#059669' }}>
                🚀
              </div>
              <div>
                <div className={styles.actionTitle}>My Projects</div>
                <div className={styles.actionSubtext}>{projects.length} deployments</div>
              </div>
            </Link>

            <Link to="/leader/applications" className={styles.actionTile}>
              <div className={styles.actionIconBox} style={{ background: '#FFFBEB', color: '#D97706' }}>
                📋
              </div>
              <div>
                <div className={styles.actionTitle}>Track Proposals</div>
                <div className={styles.actionSubtext}>{applications.length} submitted</div>
              </div>
            </Link>

            <Link to="/leader/certificates" className={styles.actionTile}>
              <div className={styles.actionIconBox} style={{ background: '#FCE4EC', color: '#E85D96' }}>
                🎓
              </div>
              <div>
                <div className={styles.actionTitle}>Certificates</div>
                <div className={styles.actionSubtext}>{certificates.length} verified</div>
              </div>
            </Link>

            <Link to="/leader/team" className={styles.actionTile}>
              <div className={styles.actionIconBox} style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                👥
              </div>
              <div>
                <div className={styles.actionTitle}>Manage Squad</div>
                <div className={styles.actionSubtext}>{team?.members?.length || 0} members</div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── 3. CURRENT ACTIVE PROJECT ── */}
        <section>
          {activeProject ? (
            <div className={styles.projectHighlightCard}>
              <div className={styles.projectHeader}>
                <div className={styles.projectTitleGroup}>
                  <div className={styles.projectProblemSubtitle}>
                    CURRENT ACTIVE PROJECT · {activeProject.problem_domain || 'Engineering Solution'}
                  </div>
                  <h2 className={styles.projectMainTitle}>{activeProject.problem_title}</h2>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--jiggly-text-muted)', marginTop: 4 }}>
                    Deploying Squad: <strong>{activeProject.team_name}</strong> · Project #{activeProject.id}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Badge
                    variant={
                      activeProject.status === 'completed'
                        ? 'success'
                        : activeProject.status === 'submitted_for_review'
                        ? 'warning'
                        : 'primary'
                    }
                  >
                    {activeProject.status === 'submitted_for_review'
                      ? 'REVIEW PENDING'
                      : activeProject.status.toUpperCase()}
                  </Badge>

                  <Link to="/leader/projects">
                    <Button variant="primary" size="small">
                      Open Project Workspace →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className={styles.progressContainer}>
                <div className={styles.progressLabelRow}>
                  <span style={{ color: 'var(--jiggly-pink-deep)' }}>
                    OVERALL QUEST PROGRESS
                  </span>
                  <span style={{ color: 'var(--jiggly-text)' }}>
                    {progressPercent}% COMPLETE
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* ── 4. PROJECT QUEST JOURNEY (MILESTONES TRACK) ── */}
              <div className={styles.questTrackContainer}>
                <div className={styles.questSectionTitle}>
                  <span>🗺️</span>
                  <span>PROJECT JOURNEY & QUEST STAGES</span>
                </div>

                <div className={styles.questStepsRow}>
                  {/* Step 1: Research & Setup */}
                  <div
                    className={`${styles.questStepCard} ${
                      progressPercent >= 25 ? styles.questStepCompleted : styles.questStepActive
                    }`}
                  >
                    <div
                      className={`${styles.stepIconCircle} ${
                        progressPercent >= 25 ? styles.stepIconCompleted : styles.stepIconActive
                      }`}
                    >
                      {progressPercent >= 25 ? '✓' : '1'}
                    </div>
                    <div className={styles.stepInfo}>
                      <div className={styles.stepTitle}>1. Research & Blueprint</div>
                      <div className={styles.stepSubtext}>
                        {progressPercent >= 25 ? 'Architecture finalized' : 'In progress'}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Prototyping */}
                  <div
                    className={`${styles.questStepCard} ${
                      progressPercent >= 60
                        ? styles.questStepCompleted
                        : progressPercent >= 25
                        ? styles.questStepActive
                        : ''
                    }`}
                  >
                    <div
                      className={`${styles.stepIconCircle} ${
                        progressPercent >= 60
                          ? styles.stepIconCompleted
                          : progressPercent >= 25
                          ? styles.stepIconActive
                          : styles.stepIconPending
                      }`}
                    >
                      {progressPercent >= 60 ? '✓' : '2'}
                    </div>
                    <div className={styles.stepInfo}>
                      <div className={styles.stepTitle}>2. Prototype Assembly</div>
                      <div className={styles.stepSubtext}>
                        {progressPercent >= 60 ? 'Hardware tested' : 'Bench calibration'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Field Verification */}
                  <div
                    className={`${styles.questStepCard} ${
                      progressPercent >= 90
                        ? styles.questStepCompleted
                        : progressPercent >= 60
                        ? styles.questStepActive
                        : ''
                    }`}
                  >
                    <div
                      className={`${styles.stepIconCircle} ${
                        progressPercent >= 90
                          ? styles.stepIconCompleted
                          : progressPercent >= 60
                          ? styles.stepIconActive
                          : styles.stepIconPending
                      }`}
                    >
                      {progressPercent >= 90 ? '✓' : '3'}
                    </div>
                    <div className={styles.stepInfo}>
                      <div className={styles.stepTitle}>3. Field Deployment</div>
                      <div className={styles.stepSubtext}>
                        {progressPercent >= 90 ? 'Telemetry submitted' : 'Field trials'}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Final Sign-off & Certificate */}
                  <div
                    className={`${styles.questStepCard} ${
                      activeProject.status === 'completed'
                        ? styles.questStepCompleted
                        : activeProject.status === 'submitted_for_review'
                        ? styles.questStepActive
                        : ''
                    }`}
                  >
                    <div
                      className={`${styles.stepIconCircle} ${
                        activeProject.status === 'completed'
                          ? styles.stepIconCompleted
                          : activeProject.status === 'submitted_for_review'
                          ? styles.stepIconActive
                          : styles.stepIconPending
                      }`}
                    >
                      {activeProject.status === 'completed' ? '🏆' : '4'}
                    </div>
                    <div className={styles.stepInfo}>
                      <div className={styles.stepTitle}>4. Impact Certificate</div>
                      <div className={styles.stepSubtext}>
                        {activeProject.status === 'completed' ? 'Certified!' : 'University review'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Friendly Empty State with Jigglypuff Mascot */
            <div className={styles.emptyStateContainer}>
              <JigglypuffMascot
                variant="sleeping"
                size="large"
                speech="No active quest yet! Let's explore open challenges."
              />
              <h2 className={styles.emptyTitle}>Your Adventure Is Waiting!</h2>
              <p className={styles.emptySubtitle}>
                Once your team submits a civic proposal and gets selected by the university, your live engineering project workspace and quest milestones will appear right here.
              </p>
              <Link to="/leader/problems">
                <Button variant="primary">
                  🔍 Browse Open Civic Problems & Apply
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* ── 5. CELEBRATORY CERTIFICATES SHOWCASE ── */}
        {certificates.length > 0 && (
          <section className={styles.certificateBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <JigglypuffMascot variant="celebrate" size="small" showShadow={false} />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  CONGRATULATIONS, TRAINER!
                </div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--jiggly-text)', margin: '2px 0 0 0' }}>
                  You have {certificates.length} Cryptographically Verified Certificate{certificates.length > 1 ? 's' : ''}!
                </h3>
              </div>
            </div>

            <Link to="/leader/certificates">
              <Button variant="primary" size="small">
                📜 View & Download PDF Certificates
              </Button>
            </Link>
          </section>
        )}

        {/* ── 6. PROPOSALS & APPLICATION STATUS TRACKER ── */}
        {applications.length > 0 && (
          <section style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--jiggly-text)', margin: 0 }}>
                  Active Proposals Status ({applications.length})
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--jiggly-text-muted)', margin: '2px 0 0 0' }}>
                  Track faculty reviews and municipal evaluation progress in real time.
                </p>
              </div>

              <Link to="/leader/applications" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--jiggly-pink-deep)' }}>
                View All Proposals →
              </Link>
            </div>

            <div className={styles.applicationsList}>
              {applications.slice(0, 3).map((a) => {
                let statusMessage = 'Proposal submitted and queued for evaluation.';
                let badgeVariant = 'neutral';

                if (a.status === 'selected') {
                  statusMessage = '🎉 Congratulations! Your proposal was selected and project is activated.';
                  badgeVariant = 'success';
                } else if (a.status === 'approved') {
                  statusMessage = '✓ Endorsed by participating university. Awaiting final selection.';
                  badgeVariant = 'primary';
                } else if (a.status === 'rejected') {
                  statusMessage = 'Not selected for this cycle. Review feedback to sharpen next proposal.';
                  badgeVariant = 'danger';
                } else if (a.status === 'ranked') {
                  statusMessage = `Scored: ${a.score || '—'} (Rank #${a.rank || '1'}). In final activation window.`;
                  badgeVariant = 'warning';
                } else {
                  statusMessage = 'Your proposal is currently being reviewed by university faculty.';
                  badgeVariant = 'warning';
                }

                return (
                  <div key={a.id} className={styles.appItemCard}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--jiggly-text)' }}>
                          {a.problem_title || `Proposal #${a.id}`}
                        </span>
                        <Badge variant={badgeVariant} size="small">
                          {a.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--jiggly-text-muted)', margin: 0 }}>
                        {statusMessage}
                      </p>
                    </div>

                    <Link to="/leader/applications">
                      <Button variant="secondary" size="small">
                        View Review Details
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 7. TEAM ROSTER & SQUAD MANAGEMENT ── */}
        {profile?.status === 'approved' && !team && (
          <section>
            <Card>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <JigglypuffMascot variant="trainer" size="medium" />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--jiggly-text)', margin: '0 0 6px 0' }}>
                    Assemble Your Engineering Squad
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--jiggly-text-muted)', margin: '0 0 16px 0' }}>
                    Every civic quest requires a capable team. Name your squad and recruit student engineers.
                  </p>
                  <form onSubmit={createTeam} style={{ display: 'flex', gap: 10, maxWidth: 440 }}>
                    <input
                      type="text"
                      placeholder="e.g. Jigglypuff Squad / EcoPioneers"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--jiggly-border)',
                      }}
                    />
                    <Button type="submit" variant="primary" disabled={busy}>
                      Create Squad
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* Squad Members Roster */}
        {team && (
          <section style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--jiggly-text)', margin: 0 }}>
                  Engineering Squad Roster ({team?.members?.length || 0})
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--jiggly-text-muted)', margin: '2px 0 0 0' }}>
                  Squad: <strong>{team?.name}</strong> · Average Squad Score: {team?.score || '3.0'}
                </p>
              </div>

              <Link to="/leader/team">
                <Button variant="secondary" size="small">
                  Manage Squad Members →
                </Button>
              </Link>
            </div>

            <Card>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {(team?.members || []).map((m) => (
                    <div
                      key={m.id}
                      style={{
                        background: '#FAFBFD',
                        border: '1px solid var(--jiggly-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 12,
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--jiggly-text)' }}>
                          {m.name}
                        </strong>
                        <Badge variant={m.verified ? 'success' : 'neutral'} size="small">
                          {m.verified ? 'VERIFIED' : 'PENDING'}
                        </Badge>
                      </div>

                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--jiggly-text-muted)' }}>
                        {m.branch || 'Engineering'} · Year {m.year || '1'}
                      </div>

                      {m.speciality && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          <Chip size="small">{m.speciality}</Chip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </section>
        )}
      </div>
    </PixelMeadowBg>
  );
}
