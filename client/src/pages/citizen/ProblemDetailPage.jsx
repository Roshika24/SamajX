import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { api } from '../../utils/api';

export default function ProblemDetailPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const [problemResponse, commentsResponse] = await Promise.all([api.get(`/problems/${id}`), api.get(`/problems/${id}/comments`)]);
      setProblem(problemResponse.data); setComments(commentsResponse.data || []); setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);
  async function submitComment(event) {
    event.preventDefault(); setError('');
    try { await api.post(`/problems/${id}/comments`, { content }); setContent(''); const response = await api.get(`/problems/${id}/comments`); setComments(response.data || []); }
    catch (e) { setError(e.message); }
  }
  async function flagComment(commentId) {
    const reason = window.prompt('Why should moderators review this comment?');
    if (!reason?.trim()) return;
    try { await api.post(`/problems/${id}/comments/${commentId}/flag`, { reason }); window.alert('Comment flagged for review.'); }
    catch (e) { setError(e.message); }
  }
  async function vote() {
    try { const response = await api.post(`/problems/${id}/upvote`, {}); setProblem((p) => ({ ...p, viewer_upvoted: response.data.upvoted, upvote_count: p.upvote_count + (response.data.upvoted ? 1 : -1) })); }
    catch (e) { setError(e.message); }
  }
  if (loading) return <p role="status">Loading problem…</p>;
  if (!problem) return <div><p role="alert">{error || 'Problem not found'}</p><Link to="/citizen/problems">Back to problem feed</Link></div>;
  return <div style={{ display: 'grid', gap: 18, maxWidth: 900 }}>
    <Link to="/citizen/problems">← Back to problem feed</Link>
    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
    <Card><p className="eyebrow">{problem.domain_name || problem.category} · {problem.status.replaceAll('_', ' ')}</p><h1>{problem.title}</h1><p>{problem.description}</p><p><strong>{problem.report_count}</strong> reports · <strong>{problem.upvote_count}</strong> upvotes</p><Button onClick={vote} variant={problem.viewer_upvoted ? 'secondary' : 'primary'}>{problem.viewer_upvoted ? 'Remove support' : 'Support this problem'}</Button>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}><span>Location: {Number(problem.lat).toFixed(5)}, {Number(problem.lng).toFixed(5)}</span><a href={`https://www.openstreetmap.org/?mlat=${problem.lat}&mlon=${problem.lng}#map=17/${problem.lat}/${problem.lng}`} target="_blank" rel="noreferrer">Open map ↗</a></div>
    </Card>
    <Card><h2>Community discussion ({comments.length})</h2><form onSubmit={submitComment} style={{ display: 'grid', gap: 10, margin: '14px 0 20px' }}><label htmlFor="problem-comment">Add a comment</label><textarea id="problem-comment" rows={3} minLength={2} maxLength={2000} required value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share useful information or an update…" style={fieldStyle} /><Button type="submit">Post comment</Button></form>
      {comments.length ? comments.map((comment) => <div key={comment.id} style={{ padding: '14px 0', borderTop: '1px solid var(--color-gray-200)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{comment.author_name}</strong><small>{new Date(comment.created_at).toLocaleString()}</small></div><p style={{ margin: '8px 0' }}>{comment.content}</p><button type="button" onClick={() => flagComment(comment.id)} style={{ color: 'var(--color-ink-muted)', textDecoration: 'underline' }}>Flag comment</button></div>) : <p>No comments yet. Be the first to add useful context.</p>}
    </Card>
  </div>;
}
const fieldStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--color-gray-300, #d0d5dd)', borderRadius: 10 };
