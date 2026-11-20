import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

export default function UniversityProblemsPage() {
  const [routedProblems, setRoutedProblems] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState({});

  async function load() {
    try {
      const [probRes, appRes] = await Promise.all([
        api.get('/applications/university/problems'),
        api.get('/applications/university/reviews'),
      ]);
      setRoutedProblems(probRes.data || []);
      setApplications(appRes.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reviewApplication(id, decision) {
    setBusy((v) => ({ ...v, [`app_${id}`]: true }));
    setError('');
    setNotice('');

    try {
      await api.patch(`/applications/${id}/university-review`, {
        decision,
        feedback: '',
      });
      setNotice(`Application #${id} has been marked as ${decision}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`app_${id}`]: false }));
    }
  }

  async function reviewDifficulty(problemId, action, overrideDifficulty) {
    setBusy((v) => ({ ...v, [`diff_${problemId}`]: true }));
    setError('');
    setNotice('');

    try {
      await api.post(`/ai/problems/${problemId}/difficulty/review`, {
        action,
        overrideDifficulty,
      });
      setNotice(
        `Difficulty prediction for problem #${problemId} ${action === 'accept' ? 'accepted' : 'overridden'}.`
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`diff_${problemId}`]: false }));
    }
  }

  function getDifficultyVariant(diff) {
    switch (diff?.toLowerCase()) {
      case 'hard':
      case 'advanced':
        return 'danger';
      case 'medium':
      case 'intermediate':
        return 'warning';
      case 'small':
      case 'easy':
      case 'beginner':
        return 'success';
      default:
        return 'neutral';
    }
  }

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            ACADEMIC OVERSIGHT
          </span>
          <Badge variant="primary">{routedProblems.length} Routed Problems</Badge>
          <Badge variant="warning">{applications.length} Student Proposals</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Civic Problems & Proposal Reviews
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Review civic challenges routed to your faculty departments, calibrate AI-predicted difficulty ratings, and evaluate student engineering proposals.
        </p>
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

      {notice && (
        <div
          role="status"
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-emerald-700, #047857)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{notice}</span>
        </div>
      )}

      {/* SECTION 1: ROUTED PROBLEMS & AI DIFFICULTY */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            1. Routed Problems & AI Difficulty Validation
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Faculty members validate the technical scope and difficulty level recommended by the AI classifier.
          </p>
        </div>

        {!routedProblems.length ? (
          <Card>
            <EmptyState
              title="No Problems Currently Routed"
              message="No civic problems are currently routed to your university departments."
            />
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {routedProblems.map((p) => (
              <Card key={p.id}>
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Problem Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-ink-muted)' }}>
                          CHALLENGE #{p.id}
                        </span>
                        <Badge variant="neutral">{p.domain_name || 'General Civic'}</Badge>
                        <Badge variant={p.distance_label === 'Far away' ? 'warning' : 'info'}>
                          📍 {p.distance_km ? `${p.distance_km} km` : '0 km'} {p.distance_label === 'Far away' ? '· Far away' : '· Within range'}
                        </Badge>
                        <Badge variant={getDifficultyVariant(p.difficulty)}>
                          Current: {p.difficulty ? p.difficulty.toUpperCase() : 'PENDING'}
                        </Badge>
                      </div>
                      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                        {p.title}
                      </h3>
                    </div>

                    <Badge variant={p.status === 'open_for_applications' ? 'success' : 'default'}>
                      {p.status}
                    </Badge>
                  </div>

                  {p.description && (
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-ink-light)', lineHeight: 1.5 }}>
                      {p.description}
                    </p>
                  )}

                  {/* AI Difficulty Review Box */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface-sunken)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 16,
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🧠</span>
                        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                          AI Algorithmic Complexity Assessment
                        </strong>
                      </div>
                      <Badge variant={p.ai_difficulty_status === 'accepted' ? 'success' : p.ai_difficulty_status === 'overridden' ? 'warning' : 'neutral'}>
                        {p.ai_difficulty_status || 'Pending Review'}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                        Suggested Rating:{' '}
                        <strong style={{ textTransform: 'capitalize', color: 'var(--color-primary)' }}>
                          {p.ai_suggested_difficulty || 'Pending Analysis'}
                        </strong>
                      </div>
                    </div>

                    {p.ai_difficulty_reason && (
                      <div
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-ink-muted)',
                          fontStyle: 'italic',
                          padding: '8px 12px',
                          backgroundColor: 'var(--color-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        "{p.ai_difficulty_reason}"
                      </div>
                    )}

                    {p.ai_difficulty_status === 'suggested' && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flexWrap: 'wrap',
                          paddingTop: 8,
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => reviewDifficulty(p.id, 'accept')}
                          disabled={busy[`diff_${p.id}`]}
                        >
                          ✓ Accept AI Rating ({p.ai_suggested_difficulty})
                        </Button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>Or Override:</span>
                          <select
                            id={`override-diff-p-${p.id}`}
                            defaultValue={p.difficulty || 'medium'}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)',
                              fontSize: 'var(--text-xs)',
                              outline: 'none',
                            }}
                          >
                            <option value="small">Small / Low Complexity</option>
                            <option value="medium">Medium Complexity</option>
                            <option value="hard">Hard / High Complexity</option>
                          </select>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              const sel = document.getElementById(`override-diff-p-${p.id}`).value;
                              reviewDifficulty(p.id, 'override', sel);
                            }}
                            disabled={busy[`diff_${p.id}`]}
                          >
                            Save Override
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: STUDENT TEAM APPLICATIONS */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            2. Student Engineering Proposals ({applications.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Evaluate feasibility, approach, and allocate university supervision for student proposals.
          </p>
        </div>

        {!applications.length ? (
          <Card>
            <EmptyState
              title="No Proposals Awaiting Review"
              message="There are currently no student team applications awaiting university evaluation."
            />
          </Card>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {applications.map((a) => (
              <Card key={a.application_id}>
                <div style={{ display: 'grid', gap: 14 }}>
                  {/* Proposal Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Civic Problem Proposal
                      </span>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: '2px 0 4px 0' }}>
                        {a.problem_title}
                      </h3>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                        Squad: <strong>{a.team_name}</strong> · Leader: <strong>{a.leader_name}</strong> · Squad Level:{' '}
                        <strong>{a.level || 'beginner'}</strong> ({a.level_score || 0} XP)
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge variant={a.application_status === 'selected' || a.application_status === 'approved' ? 'success' : 'neutral'}>
                        {a.application_status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Proposal Details Box */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-surface-sunken)',
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      display: 'grid',
                      gap: 8,
                      color: 'var(--color-ink)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {a.mentor_name && (
                      <div>
                        <strong>Faculty Mentor / Advisor:</strong> {a.mentor_name}
                      </div>
                    )}
                    <div>
                      <strong>Technical Approach:</strong>
                      <p style={{ margin: '4px 0 0 0', lineHeight: 1.5, color: 'var(--color-ink-light)' }}>
                        {a.approach}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                      <div>
                        <strong>Timeline:</strong> {a.timeline}
                      </div>
                      <div>
                        <strong>Team Skills:</strong> {a.skills}
                      </div>
                      <div>
                        <strong>Solution Type:</strong> {a.solution_type}
                      </div>
                      <div>
                        <strong>Municipal Authority Needed:</strong> {a.needs_authority ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {/* University Review Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      paddingTop: 8,
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)' }}>
                      Review Status: <strong style={{ textTransform: 'capitalize' }}>{a.university_review_status}</strong>
                    </div>

                    {a.university_review_status === 'pending' && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Button
                          size="small"
                          variant="primary"
                          disabled={busy[`app_${a.application_id}`]}
                          onClick={() => reviewApplication(a.application_id, 'approved')}
                        >
                          ✓ Approve Proposal
                        </Button>
                        <Button
                          size="small"
                          variant="secondary"
                          disabled={busy[`app_${a.application_id}`]}
                          onClick={() => reviewApplication(a.application_id, 'rejected')}
                        >
                          Reject Proposal
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
