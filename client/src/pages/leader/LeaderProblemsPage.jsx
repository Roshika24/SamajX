
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

const field = {
  width: '100%',
  padding: 10,
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  marginTop: 6
};

const label = {
  display: 'block',
  margin: '12px 0',
  fontWeight: 600
};

const emptyForm = {
  approach: '',
  timeline: '',
  skills: '',
  budget_resources: '',
  solution_type: '',
  mentor_member_id: '',
  mentor_name: ''
};

export default function LeaderProblemsPage() {
  const [items, setItems] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState(emptyForm);

  async function load() {
    try {
      const r = await api.get('/applications/problems');
      setItems(r.data || r);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    api.get('/applications/mentor-options')
      .then(r => setMentors(r.data || []))
      .catch(() => {});

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function change(e) {
    const { name, value } = e.target;

    setForm(current => {
      if (name === 'mentor_member_id') {
        const member = mentors.find(m => String(m.id) === value);

        return {
          ...current,
          mentor_member_id: value,
          mentor_name: member?.name || ''
        };
      }

      return { ...current, [name]: value };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        ...form,
        mentor_member_id: form.mentor_member_id
          ? Number(form.mentor_member_id)
          : undefined,
        mentor_name: form.mentor_name.trim() || undefined
      };

      await api.post(`/applications/problems/${selected.id}`, payload);

      setNotice('Application submitted successfully.');
      setSelected(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1000 }}>
      <div>
        <p className="eyebrow">TEAM LEADER · DISCOVERY</p>
        <h1>Browse routed problems</h1>
        <p>
          Problems routed to your university are shown here. Distance is
          informational; problems are not hidden because they are far away.
        </p>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--color-danger,#b42318)' }}>
          {error}
        </p>
      )}

      {notice && (
        <Card style={{ padding: 16 }}>
          <strong>Submitted</strong>
          <p>{notice}</p>
        </Card>
      )}

      {!items.length && (
        <Card style={{ padding: 20 }}>
          No open problems are currently routed to your university.
        </Card>
      )}

      {items.map(p => (
        <Card key={p.id} style={{ padding: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <div>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                <Badge variant={p.distance_label === 'Far away' ? 'danger' : 'info'}>
                  📍 {Number(p.distance_km || 0).toFixed(1)} km · {p.distance_label || 'Within range'}
                </Badge>
                <Badge>{p.domain_name || 'Unclassified'}</Badge>
                <Badge variant="warning">{p.difficulty || 'Difficulty pending'}</Badge>
                <Badge variant={p.status === 'open_for_applications' ? 'success' : 'default'}>{p.status}</Badge>
              </div>
            </div>
            <span>{p.status}</span>
          </div>

          <p>
            Allowed solutions:{' '}
            {(p.solution_types || []).join(', ') || 'Not set'}
          </p>

          {p.window_closes_at && (
            <p>
              Application deadline:{' '}
              {new Date(p.window_closes_at).toLocaleString()} ·{' '}
              <strong>
                {(() => {
                  const ms = Math.max(
                    0,
                    new Date(p.window_closes_at).getTime() - now
                  );
                  const h = Math.floor(ms / 3600000);
                  const m = Math.floor((ms % 3600000) / 60000);
                  const sec = Math.floor((ms % 60000) / 1000);

                  return ms === 0
                    ? 'Closed'
                    : `${h}h ${m}m ${sec}s remaining`;
                })()}
              </strong>
            </p>
          )}

          <Button
            onClick={() => {
              setError('');
              setNotice('');
              setSelected(p);
              setForm(current => ({
                ...emptyForm,
                solution_type: p.solution_types?.[0] || ''
              }));
            }}
          >
            Apply
          </Button>

          {selected?.id === p.id && (
            <form
              onSubmit={submit}
              style={{
                marginTop: 18,
                borderTop: '1px solid var(--color-border)',
                paddingTop: 12
              }}
            >
              <label style={label}>
                Proposed approach
                <textarea
                  required
                  minLength={50}
                  name="approach"
                  value={form.approach}
                  onChange={change}
                  style={field}
                />
              </label>

              <label style={label}>
                Timeline
                <input
                  required
                  name="timeline"
                  value={form.timeline}
                  onChange={change}
                  style={field}
                />
              </label>

              <label style={label}>
                Team skills
                <input
                  required
                  name="skills"
                  value={form.skills}
                  onChange={change}
                  style={field}
                />
              </label>

              <label style={label}>
                Budget / resources
                <textarea
                  name="budget_resources"
                  value={form.budget_resources}
                  onChange={change}
                  style={field}
                />
              </label>

              <label style={label}>
                Solution type
                <select
                  required
                  name="solution_type"
                  value={form.solution_type}
                  onChange={change}
                  style={field}
                >
                  {(p.solution_types || []).map(t => (
                    <option key={t} value={t}>
                      {t.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <label style={label}>
                Mentor team member (optional)
                <select
                  name="mentor_member_id"
                  value={form.mentor_member_id}
                  onChange={change}
                  style={field}
                >
                  <option value="">External faculty / other mentor</option>
                  {mentors.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.branch}
                    </option>
                  ))}
                </select>
              </label>

              <label style={label}>
                Mentor name (optional)
                <input
                  name="mentor_name"
                  value={form.mentor_name}
                  onChange={change}
                  style={field}
                />
              </label>

              <p>
                <small>
                  Mentor details are optional and are recorded for reference
                  only. No mentor invitation or approval is required.
                </small>
              </p>

              <Button type="submit" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit application'}
              </Button>
              {' '}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}
