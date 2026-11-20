import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

const TYPES = [
  'survey',
  'design_proposal',
  'prototype_software',
  'research_report',
  'awareness_drive',
  'pilot',
];

export default function Phase4AdminPage() {
  const [problems, setProblems] = useState([]);
  const [apps, setApps] = useState([]);
  const [domains, setDomains] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState({});

  async function load() {
    try {
      const [p, a, d] = await Promise.all([
        api.get('/admin/phase4/problems'),
        api.get('/admin/phase4/applications'),
        api.get('/domains'),
      ]);

      setProblems(p.data || []);
      setApps(a.data || []);
      setDomains(d.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function reviewDomain(problemId, action, overrideDomainId) {
    setBusy((v) => ({ ...v, [`ai_d_${problemId}`]: true }));
    setError('');
    setNotice('');
    try {
      await api.post(`/ai/problems/${problemId}/domain/review`, {
        action,
        overrideDomainId: overrideDomainId ? Number(overrideDomainId) : undefined,
      });
      setNotice(`AI Domain for problem #${problemId} ${action === 'accept' ? 'accepted' : 'overridden'} successfully.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`ai_d_${problemId}`]: false }));
    }
  }

  async function reviewDifficulty(problemId, action, overrideDifficulty) {
    setBusy((v) => ({ ...v, [`ai_diff_${problemId}`]: true }));
    setError('');
    setNotice('');
    try {
      await api.post(`/ai/problems/${problemId}/difficulty/review`, {
        action,
        overrideDifficulty,
      });
      setNotice(`AI Difficulty for problem #${problemId} ${action === 'accept' ? 'accepted' : 'overridden'} successfully.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`ai_diff_${problemId}`]: false }));
    }
  }

  async function reEnqueueAI(problemId) {
    setBusy((v) => ({ ...v, [`ai_q_${problemId}`]: true }));
    setError('');
    setNotice('');
    try {
      await api.post(`/ai/problems/${problemId}/re-enqueue`, {});
      setNotice(`AI analysis jobs re-enqueued for problem #${problemId}.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`ai_q_${problemId}`]: false }));
    }
  }

  async function classify(id, e) {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const data = {
      difficulty: f.get('difficulty'),
      domain_id: f.get('domain_id') ? Number(f.get('domain_id')) : undefined,
      solution_types: f.getAll('solution_types'),
      required_skills: String(f.get('required_skills') || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      needs_authority: f.get('needs_authority') === 'on',
      window_hours: Number(f.get('window_hours') || 48),
      review_hours: Number(f.get('review_hours') || 48),
    };

    setBusy((v) => ({ ...v, [`p${id}`]: true }));
    setError('');
    setNotice('');

    try {
      const result = await api.patch(
        `/admin/phase4/problems/${id}/classification`,
        data
      );

      setNotice(
        result.data?.message ||
          `Problem #${id} classified and routed to ${
            result.data?.routing?.universityCount ?? 'matching'
          } universities.`
      );

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`p${id}`]: false }));
    }
  }

  async function act(id, action, body = {}) {
    setBusy((v) => ({ ...v, [`a${id}`]: true }));
    setError('');

    try {
      if (action === 'select') {
        await api.post(`/admin/phase4/applications/${id}/select`, {});
      } else if (action === 'score') {
        await api.patch(`/admin/phase4/applications/${id}/score`, body);
      }

      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`a${id}`]: false }));
    }
  }

  async function rank(problemId) {
    setBusy((v) => ({ ...v, [`r${problemId}`]: true }));
    setError('');

    try {
      await api.post(`/admin/phase4/applications/${problemId}/rank`, {});
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((v) => ({ ...v, [`r${problemId}`]: false }));
    }
  }

  async function jobs() {
    setError('');
    try {
      const r = await api.post('/admin/phase4/jobs/run', {});
      const aiR = await api.post('/ai/jobs/run', {});
      setNotice(`Lifecycle jobs completed: ${JSON.stringify(r.data || r)} | AI Worker: ${JSON.stringify(aiR.data || aiR)}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function getDifficultyVariant(diff) {
    switch (diff?.toLowerCase()) {
      case 'hard':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'small':
        return 'success';
      default:
        return 'neutral';
    }
  }

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
              CORE PLATFORM PIPELINE
            </span>
            <Badge variant="primary">{problems.length} Problems</Badge>
            <Badge variant="neutral">{apps.length} Proposals</Badge>
          </div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
            Classification, AI Review & Selection
          </h1>
          <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
            Audit AI domain suggestions, verify problem classifications, score eligible student proposals, and activate project deployments.
          </p>
        </div>

        <Button variant="secondary" onClick={jobs} size="small">
          ⚙️ Run Lifecycle & AI Jobs Now
        </Button>
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

      {/* SECTION 1: PROBLEMS & AI REVIEW */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            Civic Problems & AI Classification ({problems.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Review AI classification recommendations before opening university application windows.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {problems.map((p) => (
            <Card key={p.id}>
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Problem Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-ink-muted)' }}>
                        PROBLEM #{p.id}
                      </span>
                      <Badge variant="neutral">{p.domain_name || 'Unclassified Domain'}</Badge>
                      <Badge variant={getDifficultyVariant(p.difficulty)}>
                        {p.difficulty ? `${p.difficulty.toUpperCase()} DIFFICULTY` : 'NO DIFFICULTY'}
                      </Badge>
                    </div>
                    <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                      {p.title}
                    </h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)', marginTop: 4 }}>
                      Status: <strong>{p.status}</strong> · {p.routed_universities} routed universities ·{' '}
                      {p.application_count} applications
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--color-surface-sunken)',
                    borderRadius: 'var(--radius-md)',
                    padding: 14,
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-ink-light)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <strong style={{ color: 'var(--color-ink)' }}>Citizen Report: </strong>
                  {p.description}
                </div>

                {/* AI Assistance Section */}
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-sunken)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🧠</span>
                    <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                      AI Pipeline Intelligence
                    </strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {/* Domain AI */}
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-muted)' }}>
                        AI Suggested Domain
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)' }}>
                          {p.ai_suggested_domain_name || '—'}
                        </span>
                        <Badge variant={p.ai_domain_status === 'accepted' ? 'success' : p.ai_domain_status === 'overridden' ? 'warning' : 'neutral'}>
                          {p.ai_domain_status || 'pending'}
                        </Badge>
                      </div>
                      {p.ai_domain_explanation && (
                        <p style={{ fontSize: 'var(--text-xs)', margin: 0, color: 'var(--color-ink-light)', fontStyle: 'italic' }}>
                          "{p.ai_domain_explanation}"
                        </p>
                      )}

                      {p.ai_domain_status === 'suggested' && (
                        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                          <Button
                            size="small"
                            variant="primary"
                            onClick={() => reviewDomain(p.id, 'accept')}
                            disabled={busy[`ai_d_${p.id}`]}
                          >
                            ✓ Accept AI Domain
                          </Button>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select
                              id={`override-domain-${p.id}`}
                              defaultValue={p.domain_id || ''}
                              style={{ padding: '6px 8px', flex: 1, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-xs)' }}
                            >
                              <option value="">Select Domain…</option>
                              {domains.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => {
                                const val = document.getElementById(`override-domain-${p.id}`).value;
                                if (val) reviewDomain(p.id, 'override', val);
                              }}
                              disabled={busy[`ai_d_${p.id}`]}
                            >
                              Override
                            </Button>
                          </div>
                        </div>
                      )}
                      {p.ai_domain_status === 'failed' && (
                        <Button size="small" variant="secondary" onClick={() => reEnqueueAI(p.id)} disabled={busy[`ai_q_${p.id}`]}>
                          Retry AI Analysis
                        </Button>
                      )}
                    </div>

                    {/* Difficulty AI */}
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        padding: 14,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-muted)' }}>
                        AI Predicted Difficulty
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'capitalize' }}>
                          {p.ai_suggested_difficulty || '—'}
                        </span>
                        <Badge variant={p.ai_difficulty_status === 'accepted' ? 'success' : p.ai_difficulty_status === 'overridden' ? 'warning' : 'neutral'}>
                          {p.ai_difficulty_status || 'pending'}
                        </Badge>
                      </div>
                      {p.ai_difficulty_reason && (
                        <p style={{ fontSize: 'var(--text-xs)', margin: 0, color: 'var(--color-ink-light)', fontStyle: 'italic' }}>
                          "{p.ai_difficulty_reason}"
                        </p>
                      )}

                      {p.ai_difficulty_status === 'suggested' && (
                        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                          <Button
                            size="small"
                            variant="primary"
                            onClick={() => reviewDifficulty(p.id, 'accept')}
                            disabled={busy[`ai_diff_${p.id}`]}
                          >
                            ✓ Accept AI Difficulty
                          </Button>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <select
                              id={`override-diff-${p.id}`}
                              defaultValue={p.difficulty || 'medium'}
                              style={{ padding: '6px 8px', flex: 1, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-xs)' }}
                            >
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => {
                                const val = document.getElementById(`override-diff-${p.id}`).value;
                                reviewDifficulty(p.id, 'override', val);
                              }}
                              disabled={busy[`ai_diff_${p.id}`]}
                            >
                              Override
                            </Button>
                          </div>
                        </div>
                      )}
                      {p.ai_difficulty_status === 'failed' && (
                        <Button size="small" variant="secondary" onClick={() => reEnqueueAI(p.id)} disabled={busy[`ai_q_${p.id}`]}>
                          Retry AI Analysis
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Official Classification Form */}
                <details style={{ marginTop: 4 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                    ⚙️ Classification Settings, Eligibility & Application Window
                  </summary>
                  <form
                    onSubmit={(e) => classify(p.id, e)}
                    style={{
                      display: 'grid',
                      gap: 14,
                      marginTop: 12,
                      padding: 16,
                      backgroundColor: 'var(--color-surface-sunken)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <label style={{ display: 'grid', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        Difficulty Level
                        <select
                          name="difficulty"
                          defaultValue={p.difficulty || p.ai_suggested_difficulty || 'medium'}
                          style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </label>

                      <label style={{ display: 'grid', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        Civic Domain
                        <select
                          name="domain_id"
                          defaultValue={p.domain_id || p.ai_suggested_domain_id || ''}
                          style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                        >
                          <option value="">Keep current ({p.domain_name || 'None'})</option>
                          {domains.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: 'grid', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        Application Window (Hours)
                        <input
                          name="window_hours"
                          type="number"
                          min="1"
                          max="720"
                          defaultValue="48"
                          style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                        />
                      </label>

                      <label style={{ display: 'grid', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        Review Window (Hours)
                        <input
                          name="review_hours"
                          type="number"
                          min="1"
                          max="720"
                          defaultValue="48"
                          style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                        />
                      </label>
                    </div>

                    <label style={{ display: 'grid', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      Required Expertise & Skills (Comma-separated)
                      <input
                        name="required_skills"
                        type="text"
                        defaultValue={(p.required_skills || []).join(', ')}
                        placeholder="e.g. computer vision, IoT, GIS, sensors"
                        style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>
                        Universities with matching departments will be prioritized during matching.
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      <input
                        name="needs_authority"
                        type="checkbox"
                        defaultChecked={p.needs_authority}
                      />
                      Requires municipal or government authority coordination
                    </label>

                    <fieldset style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                      <legend style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '0 6px' }}>Allowed Solution Types</legend>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {TYPES.map((t) => (
                          <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)' }}>
                            <input
                              type="checkbox"
                              name="solution_types"
                              value={t}
                              defaultChecked={(p.solution_types || []).includes(t)}
                            />
                            {t.replaceAll('_', ' ')}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <Button type="submit" disabled={busy[`p${p.id}`]}>
                        Save Classification & Open Window
                      </Button>
                    </div>
                  </form>
                </details>

                {/* Deadlines and Ranking Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                  {p.window_closes_at ? (
                    <small style={{ color: 'var(--color-ink-muted)' }}>
                      Window closes: {new Date(p.window_closes_at).toLocaleString()} · Review deadline:{' '}
                      {p.review_deadline ? new Date(p.review_deadline).toLocaleString() : '—'}
                    </small>
                  ) : (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                      Classification pending; window not opened.
                    </span>
                  )}

                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => rank(p.id)}
                    disabled={
                      busy[`r${p.id}`] ||
                      !['open_for_applications', 'window_closed'].includes(p.status) ||
                      !p.review_deadline ||
                      new Date(p.review_deadline).getTime() > Date.now()
                    }
                  >
                    Rank Proposals & Close Window
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* SECTION 2: APPLICATIONS AND FINAL SELECTION */}
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            Proposals & Project Activation ({apps.length})
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)', margin: '4px 0 0 0' }}>
            Score proposals on technical merit, evaluate university approvals, and officially activate projects.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {apps.map((a) => (
            <Card key={a.id}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
                      {a.problem_title} · {a.team_name}
                    </h3>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                      Proposal #{a.id} · Status: <strong>{a.status}</strong>
                      {a.mentor_name && ` · Advisor: ${a.mentor_name}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {a.score != null && (
                      <Badge variant="primary">
                        Score: {a.score} {a.rank ? `(Rank #${a.rank})` : ''}
                      </Badge>
                    )}
                    <Badge variant={a.status === 'selected' ? 'success' : 'neutral'}>
                      {a.status}
                    </Badge>
                  </div>
                </div>

                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                  <strong>University Approvals: </strong>
                  {(a.reviews || []).map((r) => `${r.university_name}: ${r.status}`).join(' | ') || 'No review records yet'}
                </div>

                {/* Score inputs & Action buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                    Score (1-5):
                    <input
                      id={`score-${a.id}`}
                      type="number"
                      min="1"
                      max="5"
                      step="0.5"
                      defaultValue={a.proposal_score || 3}
                      style={{ width: 64, padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    />
                  </label>

                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      act(a.id, 'score', {
                        proposal_score: Number(document.getElementById(`score-${a.id}`).value),
                        feedback: '',
                      })
                    }
                    disabled={busy[`a${a.id}`]}
                  >
                    Save Score
                  </Button>

                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => act(a.id, 'select')}
                    disabled={a.status !== 'ranked' || busy[`a${a.id}`]}
                  >
                    ✓ Select & Activate Project
                  </Button>
                </div>

                {a.score_breakdown && (
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'var(--color-surface-sunken)',
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      margin: 0,
                      border: '1px solid var(--color-border)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {JSON.stringify(a.score_breakdown, null, 2)}
                  </pre>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
