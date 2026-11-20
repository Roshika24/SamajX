import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { api } from '../../utils/api';

export default function ProblemDetailPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [problemResponse, commentsResponse] = await Promise.all([
        api.get(`/problems/${id}`),
        api.get(`/problems/${id}/comments`),
      ]);
      setProblem(problemResponse.data);
      setComments(commentsResponse.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function submitComment(event) {
    event.preventDefault();
    if (!content.trim()) return;
    setError('');
    setIsSubmitting(true);
    try {
      await api.post(`/problems/${id}/comments`, { content });
      setContent('');
      const response = await api.get(`/problems/${id}/comments`);
      setComments(response.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function flagComment(commentId) {
    const reason = window.prompt('Why should moderators review this comment?');
    if (!reason?.trim()) return;
    try {
      await api.post(`/problems/${id}/comments/${commentId}/flag`, { reason });
      window.alert('Thank you. The comment has been flagged for moderator review.');
    } catch (e) {
      setError(e.message);
    }
  }

  async function vote() {
    try {
      const response = await api.post(`/problems/${id}/upvote`, {});
      setProblem((p) => ({
        ...p,
        viewer_upvoted: response.data.upvoted,
        upvote_count: p.upvote_count + (response.data.upvoted ? 1 : -1),
      }));
    } catch (e) {
      setError(e.message);
    }
  }

  function getStatusVariant(status) {
    switch (status) {
      case 'resolved':
      case 'completed':
        return 'success';
      case 'in_progress':
      case 'active':
        return 'primary';
      case 'open':
        return 'warning';
      default:
        return 'neutral';
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
        <p role="status" style={{ color: 'var(--color-ink-muted)', fontSize: 'var(--text-base)' }}>
          Loading civic problem details…
        </p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div style={{ maxWidth: 640, margin: '40px auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p role="alert" style={{ color: 'var(--color-danger)', fontWeight: 600, marginBottom: 16 }}>
              {error || 'Civic problem not found or has been removed.'}
            </p>
            <Link to="/citizen/problems">
              <Button variant="secondary">← Back to problem feed</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Top Navigation & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Link
          to="/citizen/problems"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-primary)',
            textDecoration: 'none',
          }}
        >
          <span>← Back to Problem Feed</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge variant={getStatusVariant(problem.status)}>
            {problem.status.replaceAll('_', ' ')}
          </Badge>
          <Badge variant="neutral">
            {problem.domain_name || problem.category || 'Civic Infrastructure'}
          </Badge>
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
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Main Problem Details Card */}
      <Card>
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.25, marginBottom: 12 }}>
              {problem.title}
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-light)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {problem.description}
            </p>
          </div>

          {/* Quick Metrics & Actions Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              padding: '16px 20px',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>Citizen Reports:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 'var(--text-base)' }}>
                  {problem.report_count}
                </span>
              </div>
              <div style={{ width: 1, height: 16, backgroundColor: 'var(--color-border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>Community Upvotes:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--text-base)' }}>
                  {problem.upvote_count}
                </span>
              </div>
            </div>

            <Button
              onClick={vote}
              variant={problem.viewer_upvoted ? 'secondary' : 'primary'}
              size="medium"
            >
              {problem.viewer_upvoted ? '✓ Supported (Click to withdraw)' : '▲ Support This Problem'}
            </Button>
          </div>

          {/* Location details */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-ink-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span>
                Coordinates: <strong>{Number(problem.lat).toFixed(5)}, {Number(problem.lng).toFixed(5)}</strong>
              </span>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${problem.lat}&mlon=${problem.lng}#map=17/${problem.lat}/${problem.lng}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--color-primary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open in OpenStreetMap ↗
            </a>
          </div>
        </div>
      </Card>

      {/* Community Discussion */}
      <Card>
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)' }}>
              Community Discussion
            </h2>
            <Badge variant="neutral">{comments.length} comments</Badge>
          </div>

          {/* Comment Form */}
          <form onSubmit={submitComment} style={{ display: 'grid', gap: 12 }}>
            <label
              htmlFor="problem-comment"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)' }}
            >
              Add your update or context
            </label>
            <textarea
              id="problem-comment"
              rows={3}
              minLength={2}
              maxLength={2000}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share civic updates, verify conditions on the ground, or propose ideas…"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-ink)',
                fontSize: 'var(--text-sm)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={isSubmitting || !content.trim()}>
                {isSubmitting ? 'Posting…' : 'Post Comment'}
              </Button>
            </div>
          </form>

          {/* Comments List */}
          <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
            {comments.length ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: 16,
                    backgroundColor: 'var(--color-surface-sunken)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary)',
                          fontWeight: 700,
                          fontSize: 'var(--text-xs)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {(comment.author_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                          {comment.author_name || 'Anonymous Citizen'}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                          {new Date(comment.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => flagComment(comment.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-ink-muted)',
                        borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none',
                      }}
                      title="Flag inappropriate or false comment"
                    >
                      ⚐ Flag
                    </button>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)', lineHeight: 1.5, margin: 0 }}>
                    {comment.content}
                  </p>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--color-ink-muted)',
                  fontSize: 'var(--text-sm)',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                No comments yet. Be the first to add ground intelligence or civic context.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
