import {useEffect,useState} from 'react';
import {api} from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function LeaderProjectsPage(){
 const [projects,setProjects]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [draft,setDraft]=useState({}),[milestone,setMilestone]=useState({});
 async function refresh(){const r=await api.get('/projects/mine');setProjects(r.data||[]);}
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
 async function addMilestone(id,e){e.preventDefault();setBusy(true);setError('');try{const d=milestone[id]||{};await api.post(`/projects/${id}/milestones`,{title:d.title,description:d.description,proof_urls:d.proof?d.proof.split('\n').map(x=>x.trim()).filter(Boolean):[]});setMilestone(v=>({...v,[id]:{title:'',description:'',proof:''}}));await refresh();}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function submit(id,e){e.preventDefault();setBusy(true);setError('');try{const d=draft[id]||{};await api.post(`/projects/${id}/submit-completion`,{final_report:d.report,proof_urls:(d.proof||'').split('\n').map(x=>x.trim()).filter(Boolean),demo_link:d.demo||undefined});await refresh();}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div style={{display:'grid',gap:18}}><div><p className="eyebrow">PROJECT EXECUTION</p><h1>My projects</h1><p>Record milestones, submit your final report and track university sign-off.</p></div>{error&&<p role="alert">{error}</p>}
 {!projects.length&&<Card style={{padding:20}}>No selected projects yet. Once your application is selected and activated, it will appear here.</Card>}
 {projects.map(p=><Card key={p.id} style={{padding:22,display:'grid',gap:14}}><div><strong>{p.problem_title}</strong><p>{p.team_name} · {p.university_name}</p><b>Status: {p.status.replaceAll('_',' ')}</b>{p.completion_feedback&&<p role="alert">University feedback: {p.completion_feedback}</p>}</div>
 <section><h3>Project journey</h3>{(p.milestones||[]).length?(p.milestones||[]).map(m=><div key={m.id} style={{borderLeft:'3px solid var(--color-purple)',padding:'4px 12px',margin:'10px 0'}}><b>{m.title}</b><p>{m.description}</p>{(m.proof_urls||[]).map(u=><p key={u}><a href={u} target="_blank" rel="noreferrer">View proof</a></p>)}<small>{new Date(m.created_at).toLocaleString()}</small></div>):<p>No milestones posted yet.</p>}</section>
 {['active','reopened'].includes(p.status)&&<><form onSubmit={e=>addMilestone(p.id,e)} style={{display:'grid',gap:8}}><h3>Add milestone</h3><input placeholder="Milestone title" required value={milestone[p.id]?.title||''} onChange={e=>setMilestone(v=>({...v,[p.id]:{...v[p.id],title:e.target.value}}))}/><textarea placeholder="What did your team complete?" value={milestone[p.id]?.description||''} onChange={e=>setMilestone(v=>({...v,[p.id]:{...v[p.id],description:e.target.value}}))}/><textarea placeholder="Proof URLs (one HTTPS link per line)" value={milestone[p.id]?.proof||''} onChange={e=>setMilestone(v=>({...v,[p.id]:{...v[p.id],proof:e.target.value}}))}/><Button loading={busy}>Post milestone</Button></form>
 <form onSubmit={e=>submit(p.id,e)} style={{display:'grid',gap:8,borderTop:'1px solid var(--color-border)',paddingTop:14}}><h3>Submit final report</h3><textarea minLength={80} required rows={6} placeholder="Explain the problem, solution, implementation, outcome and limitations (at least 80 characters)." value={draft[p.id]?.report||''} onChange={e=>setDraft(v=>({...v,[p.id]:{...v[p.id],report:e.target.value}}))}/><textarea required placeholder="Final proof URLs (one HTTPS link per line)" value={draft[p.id]?.proof||''} onChange={e=>setDraft(v=>({...v,[p.id]:{...v[p.id],proof:e.target.value}}))}/><input type="url" placeholder="Demo link (optional, HTTPS)" value={draft[p.id]?.demo||''} onChange={e=>setDraft(v=>({...v,[p.id]:{...v[p.id],demo:e.target.value}}))}/><Button loading={busy}>Submit for university review</Button></form></>}
 {p.status==='completed'&&<p>Project approved. Your team certificates are available in the Certificates section.</p>}
 </Card>)}</div>;
}
