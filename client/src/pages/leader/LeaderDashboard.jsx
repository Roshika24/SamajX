import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';

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
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const result = await api.get('/leaders/me');
    setProfile(result.data.leader);
    setTeam(result.data.team);
    if (result.data.team) {
      const [detail, probRes] = await Promise.all([
        api.get(`/teams/${result.data.team.id}`),
        api.get('/applications/problems').catch(() => ({ data: [] }))
      ]);
      setTeam(detail.data);
      setProblems(probRes.data || []);
    }
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
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

  if (!profile && !error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
        <p role="status" style={{ color: 'var(--color-ink-muted)' }}>
          Loading your student workspace…
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
              STUDENT CIVIC LEADER
            </span>
            <Badge variant="primary">Campus Workspace</Badge>
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
            Welcome, {profile?.display_name || 'Team Leader'} 👋
          </h1>
          <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
            Engineer real-world solutions for local civic challenges.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {/* University Approval Pending Notice */}
      {profile?.status !== 'approved' && (
        <Card>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--color-warning)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              ⏳
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Badge variant="warning">Verification Pending</Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                  Status: {profile?.status || 'pending'}
                </span>
              </div>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-ink)' }}>
                Account Under University Review
              </h2>
              <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: 0 }}>
                Your university admin ({profile?.university_name || 'campus administrator'}) is reviewing your registration credentials.
                Once verified, you will be able to assemble your crew and apply for open civic problems.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Team Setup Prompt if Approved & No Team */}
      {profile?.status === 'approved' && !team && (
        <Card>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <Badge variant="info">First Milestone</Badge>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 8, color: 'var(--color-ink)' }}>
                Register Your Student Crew
              </h2>
              <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-sm)', margin: '4px 0 16px 0' }}>
                Your academic credentials for {profile?.university_name} are verified. Choose a name for your innovation crew to start building credentials and solving civic challenges.
              </p>
            </div>
            <form onSubmit={createTeam} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                aria-label="Team name"
                placeholder="e.g. CleanWater Innovators, SmartGrid Crew"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                minLength={2}
                style={{
                  flex: '1 1 280px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                }}
              />
              <Button type="submit" loading={busy}>
                Create Team
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Active Team Section */}
      {team && (
        <>
          {/* Team Hero Banner (Slate & Civic Blue High-Trust Theme) */}
          <div
            style={{
              padding: '28px 32px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1d4ed8 100%)',
              color: '#ffffff',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle glow / pattern */}
            <div
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.4) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
              <div>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#93c5fd',
                  }}
                >
                  OFFICIAL CIVIC CREW
                </span>
                <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, margin: '8px 0 6px 0', letterSpacing: '-0.02em' }}>
                  {team.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 'var(--text-sm)' }}>
                  <span>🏛️ {team.university_name || profile?.university_name}</span>
                  <span>·</span>
                  <span>{team.members?.length || 0} Members</span>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(8px)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {team.level || 'Beginner'} Tier
                </span>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {Number(team.level_score || 0).toFixed(1)}
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: '#93c5fd', marginLeft: 6 }}>
                    Avg XP
                  </span>
                </div>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div style={{ marginTop: 24, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: '#cbd5e1', marginBottom: 8 }}>
                <span>Team Capability Tier Progression</span>
                <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                  {team.level === 'advanced'
                    ? 'Top tier unlocked ★'
                    : `${Math.min(100, Math.round((Number(team.level_score || 0) / (team.level === 'beginner' ? 2 : 5)) * 100))}% toward next tier`}
                </span>
              </div>
              <ProgressBar
                variant="primary"
                value={team.level === 'advanced' ? 100 : Math.min(100, (Number(team.level_score || 0) / (team.level === 'beginner' ? 2 : 5)) * 100)}
              />
            </div>
          </div>

          {/* Crew Members Section */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                  Team Members ({team.members?.length || 0})
                </h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>
                  Student engineers, verified credentials, and specialized capabilities.
                </p>
              </div>
              <Chip>One Team · One Mission</Chip>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {(team.members || []).map((m) => (
                <Card key={m.id} hover>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: m.is_leader ? 'var(--color-primary-subtle)' : 'var(--color-surface-sunken)',
                            color: m.is_leader ? 'var(--color-primary)' : 'var(--color-ink)',
                            fontWeight: 800,
                            fontSize: 'var(--text-base)',
                            display: 'grid',
                            placeItems: 'center',
                            border: `1px solid ${m.is_leader ? 'rgba(37, 99, 235, 0.2)' : 'var(--color-border)'}`,
                          }}
                        >
                          {m.name?.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                            {m.is_leader ? '★ Team Leader' : `${m.branch} (Year ${m.year})`}
                          </div>
                        </div>
                      </div>
                      <Badge variant="primary">{m.credential_score || 0} XP</Badge>
                    </div>

                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', lineHeight: 1.4 }}>
                      <div>
                        <strong>Speciality:</strong> {m.speciality || 'Not specified'}
                      </div>
                      <div style={{ marginTop: 2, color: 'var(--color-ink-muted)' }}>
                        <strong>Interests:</strong> {m.interests || 'Add skills to improve matching'}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 8,
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(m.id);
                          setExpertise({
                            branch: m.branch || '',
                            speciality: m.speciality || '',
                            interests: m.interests || '',
                          });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Edit Expertise
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvidenceMember(m.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-emerald-600, #059669)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        + Add Evidence
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Edit Member Expertise Modal / Panel */}
          {editingMember && (
            <Card>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                    Update Team-Member Expertise
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: 0 }}>
                    Add genuine skills, research areas, and specialities. Platform routing uses these fields to match your team with relevant civic challenges.
                  </p>
                </div>
                <form onSubmit={saveExpertise} style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Branch
                    <input
                      value={expertise.branch}
                      onChange={(e) => setExpertise((v) => ({ ...v, branch: e.target.value }))}
                      required
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Speciality
                    <input
                      value={expertise.speciality}
                      onChange={(e) => setExpertise((v) => ({ ...v, speciality: e.target.value }))}
                      placeholder="e.g. Embedded systems, GIS analysis, structural sensing"
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Skills & Civic Interests
                    <textarea
                      value={expertise.interests}
                      onChange={(e) => setExpertise((v) => ({ ...v, interests: e.target.value }))}
                      rows={3}
                      placeholder="e.g. IoT, low-cost sensors, water quality monitoring, python data pipelines"
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <Button type="button" variant="secondary" onClick={() => setEditingMember(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                      Save Expertise
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          )}

          {/* Add Evidence Modal / Panel */}
          {evidenceMember && (
            <Card>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                    Submit Credential Evidence
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: 0 }}>
                    Evidence earns capability points (XP) after verification by your university administrator.
                  </p>
                </div>
                <form onSubmit={addEvidence} style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Evidence Type
                    <select
                      value={evidence.type}
                      onChange={(e) => setEvidence((v) => ({ ...v, type: e.target.value }))}
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                    >
                      {[
                        ['project', 'Project Work / Prototype'],
                        ['faculty_lab', 'Faculty / Lab Experience'],
                        ['hackathon', 'Civic Hackathon Award'],
                        ['certification', 'Technical Certification'],
                        ['internship', 'Industry / Public Sector Internship'],
                        ['faculty_endorsement', 'Faculty Endorsement Letter'],
                      ].map(([v, l]) => (
                        <option value={v} key={v}>{l}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Evidence Title
                    <input
                      value={evidence.title}
                      onChange={(e) => setEvidence((v) => ({ ...v, title: e.target.value }))}
                      required
                      placeholder="e.g. Smart Municipal Drainage Monitoring Hackathon - 1st Prize"
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Description
                    <textarea
                      value={evidence.description}
                      onChange={(e) => setEvidence((v) => ({ ...v, description: e.target.value }))}
                      placeholder="Detail your role, technologies used, and outcomes achieved…"
                      rows={3}
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    Verification Link (Repository, Certificate, or Drive Link)
                    <input
                      type="url"
                      value={evidence.link}
                      onChange={(e) => setEvidence((v) => ({ ...v, link: e.target.value }))}
                      placeholder="https://"
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                    />
                  </label>
                  {(evidence.type === 'faculty_lab' || evidence.type === 'faculty_endorsement') && (
                    <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      Faculty Sponsor Name
                      <input
                        value={evidence.faculty_name}
                        onChange={(e) => setEvidence((v) => ({ ...v, faculty_name: e.target.value }))}
                        required
                        placeholder="e.g. Dr. A. Sharma, Dept of Civil Engineering"
                        style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                    </label>
                  )}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <Button type="button" variant="secondary" onClick={() => setEvidenceMember(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" loading={busy}>
                      Submit for University Review
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          )}

          {/* Add Teammate Card */}
          <Card>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                  Add a Teammate
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: 0 }}>
                  Expand your innovation squad with diverse engineering and design skills.
                </p>
              </div>
              <form onSubmit={addMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { key: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g. Priya Sharma' },
                  { key: 'email', label: 'Email (Optional)', type: 'email', required: false, placeholder: 'priya@example.edu' },
                  { key: 'enrollment_number', label: 'Enrollment Number', type: 'text', required: true, placeholder: 'e.g. 2024CS089' },
                  { key: 'branch', label: 'Branch / Major', type: 'text', required: true, placeholder: 'e.g. Civil Engineering' },
                  { key: 'year', label: 'Year', type: 'text', required: true, placeholder: 'e.g. 2' },
                  { key: 'speciality', label: 'Speciality (Optional)', type: 'text', required: false, placeholder: 'e.g. IoT Hardware' },
                  { key: 'interests', label: 'Skills & Interests (Optional)', type: 'text', required: false, placeholder: 'e.g. Arduino, C++' },
                ].map((field) => (
                  <label key={field.key} style={{ display: 'grid', gap: 5, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    {field.label}
                    <input
                      type={field.type}
                      value={member[field.key]}
                      onChange={(e) => setMember((v) => ({ ...v, [field.key]: e.target.value }))}
                      required={field.required}
                      placeholder={field.placeholder}
                      style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                    />
                  </label>
                ))}
                <div style={{ alignSelf: 'end', gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <Button type="submit" loading={busy}>
                    + Add Teammate
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {/* Journey Stepper */}
          <Card>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                  Your Civic Impact Journey
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: 0 }}>
                  A transparent path from campus discovery to real-world deployment and credentialing.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                  { step: 'Team Created', status: 'completed', desc: 'Squad ready' },
                  { step: 'Build Credentials', status: 'current', desc: 'Submit evidence' },
                  { step: 'Apply to Problems', status: 'upcoming', desc: 'Propose solutions' },
                  { step: 'Execute & Deploy', status: 'upcoming', desc: 'Milestones & proof' },
                  { step: 'Earn Certificates', status: 'upcoming', desc: 'Verified impact' },
                ].map((item, idx) => (
                  <div
                    key={item.step}
                    style={{
                      padding: 12,
                      backgroundColor: idx === 0 ? 'var(--color-surface-sunken)' : 'var(--color-surface)',
                      border: idx === 1 ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: idx === 0 ? 'var(--color-primary)' : idx === 1 ? 'var(--color-primary-subtle)' : 'var(--color-surface-sunken)',
                          color: idx === 0 ? '#fff' : idx === 1 ? 'var(--color-primary)' : 'var(--color-ink-muted)',
                          fontSize: 10,
                          fontWeight: 700,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {idx === 0 ? '✓' : idx + 1}
                      </span>
                      <strong style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink)' }}>{item.step}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', paddingLeft: 26 }}>
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Available Civic Problems Preview */}
          <Card>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-ink)' }}>
                    Available Civic Problems ({problems.length})
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: 0 }}>
                    Live challenges routed for student engineering teams.
                  </p>
                </div>
                <Link
                  to="/leader/problems"
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                  }}
                >
                  View All & Submit Proposals →
                </Link>
              </div>

              {problems.length ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {problems.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        backgroundColor: 'var(--color-surface-sunken)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'grid', gap: 4 }}>
                        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                          #{p.id} · {p.title}
                        </strong>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                          Domain: <strong>{p.domain_name || 'General'}</strong> · Difficulty: <strong>{p.difficulty || 'Medium'}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Badge variant={p.distance_label === 'Far away' ? 'warning' : 'info'}>
                          📍 {p.distance_km} km {p.distance_label === 'Far away' ? '· Far away' : '· Within range'}
                        </Badge>
                        <Badge variant={p.status === 'open_for_applications' ? 'success' : 'default'}>
                          {p.status === 'open_for_applications' ? 'Open for Proposals' : p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: 'var(--color-ink-muted)',
                    fontSize: 'var(--text-sm)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  No civic problems currently open for applications in your region. Check back soon!
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
