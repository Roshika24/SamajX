const express=require('express');
const crypto=require('crypto');
const pool=require('../../db/pool');
const {requireAuth}=require('../../middleware/auth');
const {requireRole}=require('../../middleware/roles');
const {NotFoundError,ForbiddenError,ConflictError,ValidationError}=require('../../lib/errors');
const {makeCertificatePdf}=require('./certificate.pdf');
const router=express.Router();

function idOf(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw new ValidationError('Invalid ID');return n;}
function links(v){if(!Array.isArray(v)||v.length>8||v.some(x=>typeof x!=='string'||x.length>1000))throw new ValidationError('Provide up to 8 HTTPS proof links');for(const x of v){let u;try{u=new URL(x)}catch{throw new ValidationError('Invalid proof URL')}if(u.protocol!=='https:')throw new ValidationError('Proof links must use HTTPS')}return v;}
async function leaderProject(projectId,userId,db=pool){
 const {rows}=await db.query(`SELECT p.*,t.name team_name,t.university_id,l.user_id leader_user_id
 FROM projects p JOIN teams t ON t.id=p.team_id JOIN leaders l ON l.id=t.leader_id
 WHERE p.id=$1 FOR UPDATE OF p`,[projectId]);
 if(!rows[0])throw new NotFoundError('Project');
 if(Number(rows[0].leader_user_id)!==Number(userId))throw new ForbiddenError('Only the project leader can manage it');
 return rows[0];
}
router.get('/mine',requireAuth,requireRole('leader'),async(req,res,next)=>{try{
 const {rows}=await pool.query(`SELECT p.id,p.status,p.started_at,p.completed_at,p.final_report,p.final_proof_urls,p.demo_link,p.completion_feedback,t.name team_name,u.name university_name,pr.title problem_title,a.solution_type
 FROM projects p JOIN teams t ON t.id=p.team_id JOIN leaders l ON l.id=t.leader_id JOIN universities u ON u.id=t.university_id JOIN problems pr ON pr.id=p.problem_id JOIN applications a ON a.id=p.application_id
 WHERE l.user_id=$1 ORDER BY p.updated_at DESC`,[req.user.id]);
 for(const p of rows){const m=await pool.query('SELECT id,title,description,proof_urls,created_at FROM milestones WHERE project_id=$1 ORDER BY created_at,id',[p.id]);p.milestones=m.rows;}
 res.json({ok:true,data:rows});
}catch(e){next(e)}});
router.get('/university/review-queue',requireAuth,requireRole('university_admin'),async(req,res,next)=>{try{
 const {rows}=await pool.query(`SELECT p.id,p.status,p.final_report,p.final_proof_urls,p.demo_link,p.updated_at,t.name team_name,pr.title problem_title
 FROM projects p JOIN teams t ON t.id=p.team_id JOIN universities u ON u.id=t.university_id JOIN problems pr ON pr.id=p.problem_id
 WHERE u.user_id=$1 AND p.status='submitted_for_review' ORDER BY p.updated_at`,[req.user.id]);
 res.json({ok:true,data:rows});
}catch(e){next(e)}});
router.get('/university/completed',requireAuth,requireRole('university_admin'),async(req,res,next)=>{try{
 const {rows}=await pool.query(`SELECT p.id,p.status,p.final_report,p.final_proof_urls,p.demo_link,p.completed_at,p.completion_approved_at,t.name team_name,pr.title problem_title
 FROM projects p JOIN teams t ON t.id=p.team_id JOIN universities u ON u.id=t.university_id JOIN problems pr ON pr.id=p.problem_id
 WHERE u.user_id=$1 AND p.status='completed' ORDER BY p.completed_at DESC NULLS LAST`,[req.user.id]);
 for(const p of rows){
   const certs=await pool.query(`SELECT id,verification_code,member_name,solution_type,issued_at FROM certificates WHERE project_id=$1 ORDER BY member_name`,[p.id]);
   p.certificates=certs.rows;
 }
 res.json({ok:true,data:rows});
}catch(e){next(e)}});
router.post('/:id/milestones',requireAuth,requireRole('leader'),async(req,res,next)=>{
 const c=await pool.connect();try{
 const pid=idOf(req.params.id),title=String(req.body.title||'').trim(),desc=String(req.body.description||'').trim(),proof=links(req.body.proof_urls||[]);
 if(title.length<3||title.length>255||desc.length>5000)throw new ValidationError('Invalid milestone title or description');
 await c.query('BEGIN');const project=await leaderProject(pid,req.user.id,c);
 if(project.status!=='active'&&project.status!=='reopened')throw new ConflictError('Milestones require an active project');
 const {rows}=await c.query(`INSERT INTO milestones(project_id,title,description,proof_urls) VALUES($1,$2,$3,$4::jsonb) RETURNING *`,[pid,title,desc||null,JSON.stringify(proof)]);
 await c.query(`UPDATE projects SET last_milestone_at=NOW(),stale_deadline=NOW()+INTERVAL '21 days' WHERE id=$1`,[pid]);
 await c.query('COMMIT');res.status(201).json({ok:true,data:rows[0]});
 }catch(e){await c.query('ROLLBACK').catch(()=>{});next(e)}finally{c.release()}
});
router.post('/:id/submit-completion',requireAuth,requireRole('leader'),async(req,res,next)=>{try{
 const pid=idOf(req.params.id),report=String(req.body.final_report||'').trim(),proof=links(req.body.proof_urls||[]),demo=req.body.demo_link?String(req.body.demo_link).trim():null;
 if(report.length<80||report.length>20000||!proof.length)throw new ValidationError('Final report must be 80–20,000 characters and include proof');
 if(demo){let u;try{u=new URL(demo)}catch{throw new ValidationError('Invalid demo URL')}if(u.protocol!=='https:')throw new ValidationError('Demo link must use HTTPS')}
 const project=await leaderProject(pid,req.user.id);
 if(!['active','reopened'].includes(project.status))throw new ConflictError('Project is not active');
 const {rows}=await pool.query(`UPDATE projects SET status='submitted_for_review',final_report=$2,final_proof_urls=$3::jsonb,demo_link=$4,completion_feedback=NULL WHERE id=$1 AND status IN ('active','reopened') RETURNING id,status,updated_at`,[pid,report,JSON.stringify(proof),demo]);
 if(!rows[0])throw new ConflictError('Project has already been submitted or is no longer active');
 res.json({ok:true,data:rows[0]});
}catch(e){next(e)}});
router.post('/:id/completion-decision',requireAuth,requireRole('university_admin'),async(req,res,next)=>{
 const c=await pool.connect();try{
 const pid=idOf(req.params.id),decision=req.body.decision,feedback=String(req.body.feedback||'').trim();
 if(!['approve','reopen'].includes(decision)||feedback.length>2000)throw new ValidationError('Invalid completion decision or feedback');
 await c.query('BEGIN');
 const {rows}=await c.query(`SELECT p.*,u.user_id university_user_id FROM projects p JOIN teams t ON t.id=p.team_id JOIN universities u ON u.id=t.university_id WHERE p.id=$1 FOR UPDATE OF p`,[pid]);
 const p=rows[0];if(!p)throw new NotFoundError('Project');
 if(Number(p.university_user_id)!==Number(req.user.id))throw new ForbiddenError('Project belongs to another university');
 if(p.status!=='submitted_for_review')throw new ConflictError('Project is not awaiting review');
 if(decision==='reopen'){
  if(!feedback)throw new ValidationError('Feedback is required to reopen a project');
  await c.query(`UPDATE projects SET status='reopened',completion_feedback=$2,completion_approved_by=NULL,completion_approved_at=NULL WHERE id=$1`,[pid,feedback]);
  await c.query(`UPDATE problems SET status='reopened' WHERE id=$1`,[p.problem_id]);
  await c.query('COMMIT');return res.json({ok:true,data:{project_id:pid,status:'reopened'}});
 }
 await c.query(`UPDATE projects SET status='completed',completed_at=NOW(),completion_approved_by=$2,completion_approved_at=NOW(),completion_feedback=NULL WHERE id=$1`,[pid,req.user.id]);
 await c.query(`UPDATE problems SET status='completed' WHERE id=$1`,[p.problem_id]);
 const {rows:ctx}=await c.query(`SELECT p.id,u.name university_name,t.name team_name,pr.title problem_title,a.solution_type FROM projects p JOIN teams t ON t.id=p.team_id JOIN universities u ON u.id=t.university_id JOIN problems pr ON pr.id=p.problem_id JOIN applications a ON a.id=p.application_id WHERE p.id=$1`,[pid]);
 const {rows:members}=await c.query('SELECT id,name FROM team_members WHERE team_id=$1 ORDER BY id',[p.team_id]);
 for(const m of members)await c.query(`INSERT INTO certificates(project_id,member_id,verification_code,university_name,team_name,member_name,problem_title,solution_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(project_id,member_id) DO NOTHING`,[pid,m.id,crypto.randomBytes(32).toString('hex'),ctx[0].university_name,ctx[0].team_name,m.name,ctx[0].problem_title,ctx[0].solution_type]);
 await c.query('COMMIT');res.json({ok:true,data:{project_id:pid,status:'completed',certificates_issued:members.length}});
 }catch(e){await c.query('ROLLBACK').catch(()=>{});next(e)}finally{c.release()}
});
router.get('/certificates/mine',requireAuth,requireRole('leader'),async(req,res,next)=>{try{
 const {rows}=await pool.query(`SELECT c.id,c.verification_code,c.university_name,c.team_name,c.member_name,c.problem_title,c.solution_type,c.issued_at FROM certificates c JOIN team_members tm ON tm.id=c.member_id JOIN teams t ON t.id=tm.team_id JOIN leaders l ON l.id=t.leader_id WHERE l.user_id=$1 ORDER BY c.issued_at DESC`,[req.user.id]);res.json({ok:true,data:rows});
}catch(e){next(e)}});
router.get('/certificates/verify/:code',async(req,res,next)=>{try{
 const code=String(req.params.code||'');if(!/^[a-f0-9]{64}$/.test(code))throw new NotFoundError('Certificate');
 const {rows}=await pool.query(`SELECT c.verification_code,c.university_name,c.team_name,c.member_name,c.problem_title,c.solution_type,c.issued_at FROM certificates c JOIN projects p ON p.id=c.project_id WHERE c.verification_code=$1 AND p.status='completed'`,[code]);
 if(!rows[0])throw new NotFoundError('Certificate');res.json({ok:true,data:{valid:true,certificate:rows[0]}});
}catch(e){next(e)}});
router.get('/certificates/:code/pdf',async(req,res,next)=>{try{
 const code=String(req.params.code||'');if(!/^[a-f0-9]{64}$/.test(code))throw new NotFoundError('Certificate');
 const {rows}=await pool.query(`SELECT c.*,p.status project_status FROM certificates c JOIN projects p ON p.id=c.project_id WHERE c.verification_code=$1 AND p.status='completed'`,[code]);
 if(!rows[0])throw new NotFoundError('Certificate');
 const pdf=makeCertificatePdf(rows[0],`${req.protocol}://${req.get('host')}/verify/${code}`);
 res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="CivicPulse-${code.slice(0,12)}.pdf"`,'Content-Length':pdf.length});res.send(pdf);
}catch(e){next(e)}});
module.exports=router;
