import { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => { refresh().catch((e) => setError(e.message)); }, [refresh]);

  async function createTeam(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.post('/teams', { name: teamName }); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function addMember(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.post(`/teams/${team.id}/members`, { ...member, email: member.email || undefined, year: Number(member.year) }); setMember(initialMember); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function saveExpertise(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.patch(`/teams/${team.id}/members/${editingMember}`, expertise); setEditingMember(null); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function addEvidence(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.post(`/members/${evidenceMember}/evidence`, { ...evidence, link: evidence.link || undefined }); setEvidence(initialEvidence); setEvidenceMember(null); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!profile && !error) return <p>Loading your team space…</p>;
  return <div style={{ display: 'grid', gap: 22 }}>
    <div>
      <p className="eyebrow">YOUR SamajX SPACE</p>
      <h1 style={{ marginBottom: 4 }}>Hey, {profile?.display_name || 'team leader'} ✨</h1>
      <p style={{ color: 'var(--color-ink-muted)' }}>Small steps, real-world impact. Your team's journey starts here.</p>
    </div>
    {error && <p role="alert" style={{ color: 'var(--color-danger, #b42318)' }}>{error}</p>}

    {profile?.status !== 'approved' && <Card style={{ padding: 24 }}>
      <Badge variant="warning">{profile?.status || 'pending'}</Badge>
      <h2>You're on the list!</h2>
      <p>Your university admin still needs to approve your leader account. You can return here once approval is complete.</p>
    </Card>}

    {profile?.status === 'approved' && !team && <Card style={{ padding: 24 }}>
      <p className="eyebrow">FIRST MILESTONE</p><h2>Create your team</h2>
      <p>Your enrollment number and academic details are already on your leader profile. Give your crew a name to get started.</p>
      <form onSubmit={createTeam} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input aria-label="Team name" placeholder="e.g. The Groundbreakers" value={teamName} onChange={(e) => setTeamName(e.target.value)} required minLength={2} />
        <Button type="submit" loading={busy}>Create my team</Button>
      </form>
    </Card>}

    {team && <>
      <Card style={{ padding: 26, background: 'linear-gradient(125deg, var(--color-purple), #6e19c4)', color: 'white', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div><p style={{ opacity: .8, margin: 0 }}>YOUR CREW</p><h2 style={{ fontSize: '2rem', margin: '8px 0' }}>{team.name}</h2><p style={{ margin: 0, opacity: .85 }}>{team.university_name || profile.university_name}</p></div>
          <div style={{ textAlign: 'right' }}><Badge>{(team.level || 'beginner').toUpperCase()}</Badge><div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 10 }}>{Number(team.level_score || 0).toFixed(1)} <small style={{ fontSize: 14 }}>XP avg.</small></div></div>
        </div>
        <div style={{ marginTop: 22 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}><span>Progress to next level</span><span>{team.level === 'advanced' ? 'Top tier unlocked' : `${Math.min(100, Math.round((Number(team.level_score || 0) / (team.level === 'beginner' ? 2 : 5)) * 100))}%`}</span></div><ProgressBar variant="yellow" value={team.level === 'advanced' ? 100 : Math.min(100, (Number(team.level_score || 0) / (team.level === 'beginner' ? 2 : 5)) * 100)} /></div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><h2 style={{ margin: 0 }}>Your crew <span style={{ color: 'var(--color-purple)' }}>({team.members?.length || 0})</span></h2><Chip>One team · One mission</Chip></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {(team.members || []).map((m) => <Card key={m.id} style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--color-yellow)', color: 'var(--color-ink)', fontWeight: 800 }}>{m.name?.slice(0,1).toUpperCase()}</div><div><strong>{m.name}</strong><div style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{m.is_leader ? 'Team leader' : m.branch}</div></div></div>
          <p style={{ marginBottom: 8, fontSize: 13 }}>{m.speciality || 'Speciality not added'}</p><p style={{fontSize:12,color:'var(--color-ink-muted)'}}>Expertise: {m.interests || 'Add relevant skills and interests'}</p><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, flexWrap:'wrap', gap:8 }}><span>{m.credential_score} XP</span><span><button type="button" onClick={() => {setEditingMember(m.id);setExpertise({branch:m.branch||'',speciality:m.speciality||'',interests:m.interests||''});}} style={{ border: 0, background: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 700 }}>Edit expertise</button><button type="button" onClick={() => setEvidenceMember(m.id)} style={{ border: 0, background: 'none', color: 'var(--color-purple)', cursor: 'pointer', fontWeight: 700 }}>+ Add evidence</button></span></div>
        </Card>)}
      </div>

      {editingMember && <Card style={{padding:22,border:'2px solid var(--color-purple)'}}><h3>Update team-member expertise</h3><p style={{fontSize:13,color:'var(--color-ink-muted)'}}>Add only genuine skills, specialities and interests. Platform routing uses these fields to match your team to relevant civic problems.</p><form onSubmit={saveExpertise} style={{display:'grid',gap:10}}><label>Branch<input value={expertise.branch} onChange={e=>setExpertise(v=>({...v,branch:e.target.value}))} required /></label><label>Speciality<input value={expertise.speciality} onChange={e=>setExpertise(v=>({...v,speciality:e.target.value}))} placeholder="e.g. Embedded systems, computer vision" /></label><label>Skills and interests<textarea value={expertise.interests} onChange={e=>setExpertise(v=>({...v,interests:e.target.value}))} rows={3} placeholder="e.g. IoT, sensors, GIS, computer vision, road-condition monitoring" /></label><div style={{display:'flex',gap:8}}><Button type="submit" loading={busy}>Save expertise</Button><Button type="button" variant="secondary" onClick={()=>setEditingMember(null)}>Cancel</Button></div></form></Card>}

      <Card style={{ padding: 22 }}><h3>Add a teammate</h3><form onSubmit={addMember} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {Object.entries({ name: 'Full name', email: 'Email (optional)', enrollment_number: 'Enrollment number', branch: 'Branch', year: 'Year', speciality: 'Speciality', interests: 'Interests' }).map(([key,label]) => <label key={key} style={{ display: 'grid', gap: 5, fontSize: 13 }}>{label}<input name={key} type={key === 'email' ? 'email' : 'text'} value={member[key]} onChange={(e) => setMember(v => ({ ...v, [key]: e.target.value }))} required={!['email','speciality','interests'].includes(key)} /></label>)}
        <div style={{ alignSelf: 'end' }}><Button type="submit" loading={busy}>Add teammate</Button></div>
      </form></Card>

      <Card style={{ padding: 22 }}><h3>Your journey map</h3><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{['Team created','Build credentials','Apply to a problem','Make an impact','Earn certificates'].map((step,i) => <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: i === 0 ? 'var(--color-yellow)' : 'var(--color-surface)', fontWeight: 800 }}>{i === 0 ? '✓' : i+1}</span><small>{step}</small>{i < 4 && <span aria-hidden="true">→</span>}</div>)}</div><p style={{ color: 'var(--color-ink-muted)', fontSize: 13, marginBottom: 0 }}>Your progress is motivational only. Selection decisions are made using the platform's published fairness rules.</p></Card>
      <Card style={{ padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Available Civic Problems ({problems.length})</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-ink-muted)', fontSize: 13 }}>
              Explore real-world challenges. Problems located further away are labelled as <strong>Far away</strong>.
            </p>
          </div>
          <a href="/leader/problems" style={{ fontWeight: 600, fontSize: 14 }}>View all & submit proposals →</a>
        </div>

        {problems.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {problems.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>#{p.id} · {p.title}</strong>
                  <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>
                    Domain: {p.domain_name || 'General'} · Difficulty: {p.difficulty || 'Medium'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant={p.distance_label === 'Far away' ? 'danger' : 'info'}>
                    📍 {p.distance_km} km {p.distance_label === 'Far away' ? '· Far away' : '· Within range'}
                  </Badge>
                  <Badge variant={p.status === 'open_for_applications' ? 'success' : 'default'}>
                    {p.status === 'open_for_applications' ? 'Open for applications' : p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>No problems currently open.</p>
        )}
      </Card>
    </>}


    {evidenceMember && <Card style={{ padding: 22, border: '2px solid var(--color-purple)' }}><h3>Add credential evidence</h3><form onSubmit={addEvidence} style={{ display: 'grid', gap: 10 }}>
      <label>Evidence type<select value={evidence.type} onChange={(e) => setEvidence(v => ({ ...v, type: e.target.value }))}>{[['project','Project'],['faculty_lab','Faculty / lab experience'],['hackathon','Hackathon'],['certification','Certification'],['internship','Internship'],['faculty_endorsement','Faculty endorsement']].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label>Title<input value={evidence.title} onChange={(e) => setEvidence(v => ({ ...v, title: e.target.value }))} required /></label>
      <label>Description<textarea value={evidence.description} onChange={(e) => setEvidence(v => ({ ...v, description: e.target.value }))} /></label>
      <label>Link (optional)<input type="url" value={evidence.link} onChange={(e) => setEvidence(v => ({ ...v, link: e.target.value }))} /></label>
      {(evidence.type === 'faculty_lab' || evidence.type === 'faculty_endorsement') && <label>Faculty name<input value={evidence.faculty_name} onChange={(e) => setEvidence(v => ({ ...v, faculty_name: e.target.value }))} required /></label>}
      <div style={{ display: 'flex', gap: 8 }}><Button type="submit" loading={busy}>Submit evidence</Button><Button type="button" variant="secondary" onClick={() => setEvidenceMember(null)}>Cancel</Button></div>
    </form><p style={{ color: 'var(--color-ink-muted)', fontSize: 12 }}>Evidence earns points only after your university admin verifies it.</p></Card>}
  </div>;
}
