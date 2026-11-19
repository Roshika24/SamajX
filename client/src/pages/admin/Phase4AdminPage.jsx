
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState({});

  async function load() {
    try {
      const [p, a] = await Promise.all([
        api.get('/admin/phase4/problems'),
        api.get('/admin/phase4/applications')
      ]);

      setProblems(p.data || []);
      setApps(a.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      alert(JSON.stringify(r.data || r));
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1100 }}>
      <div>
        <p className="eyebrow">PLATFORM ADMIN · PHASE 4</p>
        <h1>Classification and selection</h1>
        <p>
          Classify problems, score eligible proposals and make the final
          selection. Selection requires approval from all routed universities
          and observes the active-project cap.
        </p>
        <Button onClick={jobs}>Run lifecycle jobs now</Button>
      </div>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <h2>Problem classification</h2>

      {problems.map(p => (
        <Card key={p.id} style={{ padding: 18 }}>
          <h3>#{p.id} · {p.title}</h3>
          <p>
            {p.status} · {p.routed_universities} routed universities ·{' '}
            {p.application_count} applications
          </p>

          <form
            onSubmit={e => classify(p.id, e)}
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'end'
            }}
          >
            <label>
              Difficulty
              <select
                name="difficulty"
                defaultValue={p.difficulty || 'medium'}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label>
              Domain ID
              <input
                name="domain_id"
                type="number"
                min="1"
                defaultValue=""
                placeholder={p.domain_name || 'Keep current'}
              />
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
              <small>
                Only verified universities with a matching department or
                team-member profile will be routed. Use real skills relevant
                to this problem.
              </small>
            </label>

            <label>
              <input
                name="needs_authority"
                type="checkbox"
                defaultChecked={p.needs_authority}
              />
              Needs authority
            </label>

            <fieldset style={{ minWidth: '100%' }}>
              <legend>Allowed solution types</legend>
              {TYPES.map(t => (
                <label key={t} style={{ marginRight: 12 }}>
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
              Save skills, route universities and open window
            </Button>
          </form>

          {p.window_closes_at && (
            <small>
              Window closes {new Date(p.window_closes_at).toLocaleString()} ·
              {' '}review deadline{' '}
              {p.review_deadline
                ? new Date(p.review_deadline).toLocaleString()
                : '—'}
            </small>
          )}

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
            Close / rank when eligible
          </Button>
        </Card>
      ))}

      <h2>Applications and final selection</h2>

      {apps.map(a => (
        <Card key={a.id} style={{ padding: 18 }}>
          <h3>{a.problem_title} · {a.team_name}</h3>

          <p>
            Application #{a.id} · {a.status}
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
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(a.score_breakdown, null, 2)}
            </pre>
          )}
        </Card>
      ))}
    </div>
  );
}
