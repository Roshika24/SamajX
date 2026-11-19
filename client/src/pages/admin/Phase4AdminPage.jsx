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
  'pilot'
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
        api.get('/domains')
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
    setBusy(v => ({ ...v, [`ai_d_${problemId}`]: true }));
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
      setBusy(v => ({ ...v, [`ai_d_${problemId}`]: false }));
    }
  }

  async function reviewDifficulty(problemId, action, overrideDifficulty) {
    setBusy(v => ({ ...v, [`ai_diff_${problemId}`]: true }));
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
      setBusy(v => ({ ...v, [`ai_diff_${problemId}`]: false }));
    }
  }

  async function reEnqueueAI(problemId) {
    setBusy(v => ({ ...v, [`ai_q_${problemId}`]: true }));
    setError('');
    setNotice('');
    try {
      await api.post(`/ai/problems/${problemId}/re-enqueue`, {});
      setNotice(`AI jobs re-enqueued for problem #${problemId}. Worker running.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(v => ({ ...v, [`ai_q_${problemId}`]: false }));
    }
  }

  async function classify(id, e) {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const data = {
      difficulty: f.get('difficulty'),
      domain_id: f.get('domain_id')
        ? Number(f.get('domain_id'))
        : undefined,
      solution_types: f.getAll('solution_types'),
      required_skills: String(f.get('required_skills') || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean),
      needs_authority: f.get('needs_authority') === 'on',
      window_hours: Number(f.get('window_hours') || 48),
      review_hours: Number(f.get('review_hours') || 48)
    };

    setBusy(v => ({ ...v, [`p${id}`]: true }));
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
      setBusy(v => ({ ...v, [`p${id}`]: false }));
    }
  }

  async function act(id, action, body = {}) {
    setBusy(v => ({ ...v, [`a${id}`]: true }));
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
      setBusy(v => ({ ...v, [`a${id}`]: false }));
    }
  }

  async function rank(problemId) {
    setBusy(v => ({ ...v, [`r${problemId}`]: true }));
    setError('');

    try {
      await api.post(
        `/admin/phase4/applications/${problemId}/rank`,
        {}
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(v => ({ ...v, [`r${problemId}`]: false }));
    }
  }

  async function jobs() {
    setError('');

    try {
      const r = await api.post('/admin/phase4/jobs/run', {});
      const aiR = await api.post('/ai/jobs/run', {});
      setNotice(`Lifecycle jobs: ${JSON.stringify(r.data || r)} | AI Worker: ${JSON.stringify(aiR.data || aiR)}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1100 }}>
      <div>
        <p className="eyebrow">PLATFORM ADMIN · CLASSIFICATION & AI ASSISTANCE</p>
        <h1>Classification, AI review & selection</h1>
        <p>
          Review AI-assisted domain suggestions, verify problem classifications, score eligible proposals, and activate student projects.
        </p>
        <Button onClick={jobs}>Run lifecycle & AI jobs now</Button>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-danger, #d32f2f)', background: '#ffebee', padding: 12, borderRadius: 6 }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--color-success, #2e7d32)', background: '#e8f5e9', padding: 12, borderRadius: 6 }}>{notice}</p>}

      <h2>Problems & AI Review</h2>

      {problems.map(p => (
        <Card key={p.id} style={{ padding: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0' }}>#{p.id} · {p.title}</h3>
              <p style={{ margin: 0, color: '#666' }}>
                Status: <strong>{p.status}</strong> · {p.routed_universities} routed universities ·{' '}
                {p.application_count} applications
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge variant="neutral">{p.domain_name || 'Unclassified Domain'}</Badge>
              <Badge variant={p.difficulty === 'hard' ? 'danger' : p.difficulty === 'medium' ? 'warning' : 'info'}>
                {p.difficulty ? p.difficulty.toUpperCase() : 'NO DIFFICULTY'}
              </Badge>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: 8, padding: 14 }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#555' }}>
              <strong>Citizen Description:</strong> {p.description}
            </p>
          </div>

          {/* ── AI Assistance Section ── */}
          <div style={{ border: '1px solid #d0e2ff', background: '#f0f6ff', borderRadius: 8, padding: 16 }}>
            <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#0043ce' }}>
              🤖 AI Assistance Review
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {/* Domain AI */}
              <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #c6dcff' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, color: '#525252' }}>
                  AI Suggested Domain
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {p.ai_suggested_domain_name || '—'}
                  </span>
                  <Badge variant={p.ai_domain_status === 'accepted' ? 'success' : p.ai_domain_status === 'overridden' ? 'warning' : p.ai_domain_status === 'failed' ? 'danger' : 'info'}>
                    {p.ai_domain_status || 'pending'}
                  </Badge>
                </div>
                {p.ai_domain_explanation && (
                  <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0', color: '#444' }}>
                    <em>"{p.ai_domain_explanation}"</em>
                  </p>
                )}

                {p.ai_domain_status === 'suggested' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <Button
                      onClick={() => reviewDomain(p.id, 'accept')}
                      disabled={busy[`ai_d_${p.id}`]}
                    >
                      Accept AI Domain
                    </Button>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select
                        id={`override-domain-${p.id}`}
                        defaultValue={p.domain_id || ''}
                        style={{ padding: 6, flex: 1, borderRadius: 4, border: '1px solid #ccc' }}
                      >
                        <option value="">Select Domain...</option>
                        {domains.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <Button
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
                  <Button variant="secondary" onClick={() => reEnqueueAI(p.id)} disabled={busy[`ai_q_${p.id}`]}>
                    Retry AI Analysis
                  </Button>
                )}
              </div>

              {/* Difficulty AI */}
              <div style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: '1px solid #c6dcff' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600, color: '#525252' }}>
                  AI Predicted Difficulty
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {p.ai_suggested_difficulty || '—'}
                  </span>
                  <Badge variant={p.ai_difficulty_status === 'accepted' ? 'success' : p.ai_difficulty_status === 'overridden' ? 'warning' : p.ai_difficulty_status === 'failed' ? 'danger' : 'info'}>
                    {p.ai_difficulty_status || 'pending'}
                  </Badge>
                </div>
                {p.ai_difficulty_reason && (
                  <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0', color: '#444' }}>
                    <em>"{p.ai_difficulty_reason}"</em>
                  </p>
                )}

                {p.ai_difficulty_status === 'suggested' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <Button
                      onClick={() => reviewDifficulty(p.id, 'accept')}
                      disabled={busy[`ai_diff_${p.id}`]}
                    >
                      Accept AI Difficulty
                    </Button>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select
                        id={`override-diff-${p.id}`}
                        defaultValue={p.difficulty || 'medium'}
                        style={{ padding: 6, flex: 1, borderRadius: 4, border: '1px solid #ccc' }}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <Button
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
                  <Button variant="secondary" onClick={() => reEnqueueAI(p.id)} disabled={busy[`ai_q_${p.id}`]}>
                    Retry AI Analysis
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Official Classification Form ── */}
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#333' }}>
              ⚙️ Problem Classification Settings & Application Window
            </summary>
            <form
              onSubmit={e => classify(p.id, e)}
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'end',
                marginTop: 14,
                padding: 14,
                background: '#fafafa',
                borderRadius: 6
              }}
            >
              <label>
                Difficulty
                <select
                  name="difficulty"
                  defaultValue={p.difficulty || p.ai_suggested_difficulty || 'medium'}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label>
                Domain
                <select
                  name="domain_id"
                  defaultValue={p.domain_id || p.ai_suggested_domain_id || ''}
                >
                  <option value="">Keep current ({p.domain_name || 'None'})</option>
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Application hours
                <input
                  name="window_hours"
                  type="number"
                  min="1"
                  max="720"
                  defaultValue="48"
                />
              </label>

              <label>
                Review hours
                <input
                  name="review_hours"
                  type="number"
                  min="1"
                  max="720"
                  defaultValue="48"
                />
              </label>

              <label style={{ minWidth: '100%' }}>
                Required expertise / skills (comma-separated)
                <input
                  name="required_skills"
                  type="text"
                  style={{ width: '100%' }}
                  defaultValue={(p.required_skills || []).join(', ')}
                  placeholder="e.g. computer vision, IoT, GIS, sensors"
                />
                <small style={{ color: '#666' }}>
                  Only verified universities with a matching department or team-member profile will be routed.
                </small>
              </label>

              <label>
                <input
                  name="needs_authority"
                  type="checkbox"
                  defaultChecked={p.needs_authority}
                />
                {' '}Needs municipal/local authority coordination
              </label>

              <fieldset style={{ minWidth: '100%', border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
                <legend style={{ fontSize: '0.85rem', fontWeight: 600 }}>Allowed solution types</legend>
                {TYPES.map(t => (
                  <label key={t} style={{ marginRight: 14, display: 'inline-block' }}>
                    <input
                      type="checkbox"
                      name="solution_types"
                      value={t}
                      defaultChecked={(p.solution_types || []).includes(t)}
                    />
                    {' '}{t.replaceAll('_', ' ')}
                  </label>
                ))}
              </fieldset>

              <Button
                type="submit"
                disabled={busy[`p${p.id}`]}
              >
                Save classification, route universities and open window
              </Button>
            </form>
          </details>

          {p.window_closes_at && (
            <small style={{ color: '#555' }}>
              Window closes {new Date(p.window_closes_at).toLocaleString()} ·
              {' '}Review deadline{' '}
              {p.review_deadline
                ? new Date(p.review_deadline).toLocaleString()
                : '—'}
            </small>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              onClick={() => rank(p.id)}
              disabled={
                busy[`r${p.id}`] ||
                !['open_for_applications', 'window_closed'].includes(p.status) ||
                !p.review_deadline ||
                new Date(p.review_deadline).getTime() > Date.now()
              }
            >
              Close window / Rank proposals when eligible
            </Button>
          </div>
        </Card>
      ))}

      <h2>Applications and final selection</h2>

      {apps.map(a => (
        <Card key={a.id} style={{ padding: 18 }}>
          <h3>{a.problem_title} · {a.team_name}</h3>

          <p>
            Application #{a.id} · Status: <strong>{a.status}</strong>
          </p>

          {a.mentor_name && <p>Mentor: {a.mentor_name}</p>}

          <p>
            Score: {a.score ?? 'Not ranked'}{' '}
            {a.rank ? `· Rank #${a.rank}` : ''}
          </p>

          <p>
            University approvals:{' '}
            {(a.reviews || [])
              .map(r => `${r.university_name}: ${r.status}`)
              .join(' | ') || 'No review records'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <label>
              Proposal score{' '}
              <input
                id={`score-${a.id}`}
                type="number"
                min="1"
                max="5"
                step="0.5"
                defaultValue={a.proposal_score || 3}
                style={{ width: 80, padding: 4 }}
              />
            </label>

            <Button
              variant="secondary"
              onClick={() =>
                act(a.id, 'score', {
                  proposal_score: Number(
                    document.getElementById(`score-${a.id}`).value
                  ),
                  feedback: ''
                })
              }
              disabled={busy[`a${a.id}`]}
            >
              Save score
            </Button>

            <Button
              onClick={() => act(a.id, 'select')}
              disabled={a.status !== 'ranked' || busy[`a${a.id}`]}
            >
              Select and activate project
            </Button>
          </div>

          {a.score_breakdown && (
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 8 }}>
              {JSON.stringify(a.score_breakdown, null, 2)}
            </pre>
          )}
        </Card>
      ))}
    </div>
  );
}
