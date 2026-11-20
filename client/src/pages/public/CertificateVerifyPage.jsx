import {useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import Card from '../../components/Card';
export default function CertificateVerifyPage(){
 const {code}=useParams();const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{fetch(`/api/projects/certificates/verify/${code}`).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||'Certificate not found');return j.data;}).then(setData).catch(e=>setError(e.message));},[code]);
 return <main style={{maxWidth:720,margin:'48px auto',padding:20}}><Card style={{padding:28}}><p className="eyebrow">SamajX · PUBLIC VERIFICATION</p><h1>Certificate verification</h1>{error&&<p role="alert">{error}</p>}{!data&&!error&&<p>Verifying certificate…</p>}{data&&<><h2>✓ Valid certificate</h2><p>This certificate matches a completed SamajX project.</p><dl>{Object.entries({'Member':data.certificate.member_name,'Team':data.certificate.team_name,'University':data.certificate.university_name,'Project':data.certificate.problem_title,'Solution type':data.certificate.solution_type||'—','Issued':new Date(data.certificate.issued_at).toLocaleDateString()}).map(([k,v])=><div key={k} style={{margin:'12px 0'}}><dt><b>{k}</b></dt><dd>{v}</dd></div>)}</dl><a href={`/api/projects/certificates/${code}/pdf`}>Download certificate PDF</a></>}</Card></main>;
}
