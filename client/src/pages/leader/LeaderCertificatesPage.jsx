import {useEffect,useState} from 'react';
import {api} from '../../utils/api';
import Card from '../../components/Card';
export default function LeaderCertificatesPage(){
 const [items,setItems]=useState([]),[error,setError]=useState('');
 useEffect(()=>{api.get('/projects/certificates/mine').then(r=>setItems(r.data||[])).catch(e=>setError(e.message));},[]);
 return <div style={{display:'grid',gap:16}}><div><p className="eyebrow">RECOGNITION</p><h1>Team certificates</h1><p>Each certificate has a public verification page and a downloadable PDF.</p></div>{error&&<p role="alert">{error}</p>}{!items.length&&!error&&<Card style={{padding:20}}>No certificates issued yet. Your university will issue certificates after approving project completion.</Card>}{items.map(c=><Card key={c.id} style={{padding:20}}><h3>{c.member_name}</h3><p>{c.problem_title}</p><p>{c.team_name} · {c.university_name}</p><p>Issued {new Date(c.issued_at).toLocaleDateString()}</p><a href={`/verify/${c.verification_code}`} target="_blank" rel="noreferrer">Public verification</a><br/><a href={`/api/projects/certificates/${c.verification_code}/pdf`}>Download PDF certificate</a></Card>)}</div>;
}
