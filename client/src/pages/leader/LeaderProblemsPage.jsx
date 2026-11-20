import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';

const emptyForm = {
  approach: '',
  timeline: '',
  skills: '',
  budget_resources: '',
  solution_type: '',
  mentor_member_id: '',
  mentor_name: '',
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
      .then((r) => setMentors(r.data || []))
      .catch(() => {});

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function change(e) {
    const { name, value } = e.target;
    setForm((current) => {
      if (name === 'mentor_member_id') {
        const member = mentors.find((m) => String(m.id) === value);
        return {
          ...current,
          mentor_member_id: value,
          mentor_name: member?.name || '',
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
        mentor_member_id: form.mentor_member_id ? Number(form.mentor_member_id) : undefined,
        mentor_name: form.mentor_name.trim() || undefined,
      };

      await api.post(`/applications/problems/${selected.id}`, payload);
      setNotice(`Application for "${selected.title}" submitted successfully! Your proposal is now in review.`);
      setSelected(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function getDifficultyVariant(difficulty) {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
      case 'beginner':
        return 'success';
      case 'hard':
      case 'advanced':
        return 'danger';
      case 'medium':
      default:
        return 'warning';
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            CHALLENGE DISCOVERY
          </span>
          <Badge variant="primary">{items.length} Routed</Badge>
        </div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
          Browse Routed Civic Problems
        </h1>
        <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-base)', margin: 0 }}>
          Real civic challenges matched to your university. Distance is informational; teams can engineer solutions for any open problem in their purview.
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
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-emerald-700, #047857)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <strong style={{ display: 'block', fontSize: 'var(--text-sm)' }}>Application Submitted</strong>
            <span style={{ fontSize: 'var(--text-xs)' }}>{notice}</span>
          </div>
        </div>
      )}

      {!items.length ? (
        <Card>
          <EmptyState
            title="No Problems Currently Routed"
            message="No open civic problems are currently routed to your university department. Check back periodically as new verified reports are processed."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {items.map((p) => {
            const isSelected = selected?.id === p.id;
            const msRemaining = p.window_closes_at
              ? Math.max(0, new Date(p.window_closes_at).getTime() - now)
              : null;
            const hours = msRemaining ? Math.floor(msRemaining / 3600000) : 0;
            const mins = msRemaining ? Math.floor((msRemaining % 3600000) / 60000) : 0;
            const secs = msRemaining ? Math.floor((msRemaining % 60000) / 1000) : 0;
            const isClosed = msRemaining === 0;

            return (
              <Card key={p.id}>
                <div style={{ display: 'grid', gap: 16 }}>
                  {/* Card Header & Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <Badge variant="primary">{p.domain_name || 'Civic Infrastructure'}</Badge>
                        <Badge variant={getDifficultyVariant(p.difficulty)}>
                          {p.difficulty ? `${p.difficulty.toUpperCase()} DIFFICULTY` : 'DIFFICULTY PENDING'}
                        </Badge>
                        <Badge variant={p.distance_label === 'Far away' ? 'warning' : 'info'}>
                          📍 {Number(p.distance_km || 0).toFixed(1)} km · {p.distance_label || 'Within range'}
                        </Badge>
                      </div>
                      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 6px 0' }}>
                        {p.title}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant={p.status === 'open_for_applications' ? 'success' : 'default'}>
                        {p.status === 'open_for_applications' ? '● Open for Proposals' : p.status}
                      </Badge>
                    </div>
                  </div>

                  <p style={{ color: 'var(--color-ink-light)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    {p.description}
                  </p>

                  {/* Solutions & Deadline Info Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-surface-sunken)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-ink-light)',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--color-ink)' }}>Eligible Solutions: </strong>
                      {(p.solution_types || []).map((t) => t.replaceAll('_', ' ')).join(', ') || 'Any engineering approach'}
                    </div>

                    {p.window_closes_at && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--color-ink-muted)' }}>Deadline:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: isClosed ? 'var(--color-danger)' : hours < 24 ? 'var(--color-warning)' : 'var(--color-primary)',
                            fontFamily: 'monospace',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          {isClosed ? 'Window Closed' : `${hours}h ${mins}m ${secs}s remaining`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  {!isSelected && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                      <Button
                        onClick={() => {
                          setError('');
                          setNotice('');
                          setSelected(p);
                          setForm((current) => ({
                            ...emptyForm,
                            solution_type: p.solution_types?.[0] || '',
                          }));
                        }}
                        disabled={isClosed}
                      >
                        {isClosed ? 'Window Closed' : 'Draft & Submit Proposal'}
                      </Button>
                    </div>
                  )}

                  {/* Proposal Submission Form */}
                  {isSelected && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 16,
                        borderTop: '2px solid var(--color-primary-subtle)',
                        display: 'grid',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                            Proposal Draft for "{p.title}"
                          </h3>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                            University faculty will evaluate technical feasibility and impact.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(null);
                            setForm(emptyForm);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-ink-muted)',
                            cursor: 'pointer',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          ✕ Close Draft
                        </button>
                      </div>

                      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
                        <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                          Proposed Engineering Approach (Min. 50 characters)
                          <textarea
                            required
                            minLength={50}
                            name="approach"
                            value={form.approach}
                            onChange={change}
                            rows={4}
                            placeholder="Detail methodology, architectural diagrams, sensors or materials needed, testing protocol, and anticipated community outcome…"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)',
                              fontSize: 'var(--text-sm)',
                              outline: 'none',
                            }}
                          />
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                          <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            Implementation Timeline
                            <input
                              required
                              name="timeline"
                              value={form.timeline}
                              onChange={change}
                              placeholder="e.g. 4 Weeks (W1: Sourcing, W2: Prototyping, W3: Testing, W4: Deployment)"
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                              }}
                            />
                          </label>

                          <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            Team Skills & Allocation
                            <input
                              required
                              name="skills"
                              value={form.skills}
                              onChange={change}
                              placeholder="e.g. Embedded C++, circuit board design, civil surveying"
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                              }}
                            />
                          </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                          <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            Budget & Resources Needed
                            <input
                              name="budget_resources"
                              value={form.budget_resources}
                              onChange={change}
                              placeholder="e.g. Lab oscilloscope, 2x ultrasonic sensors (~₹1,500 total)"
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                              }}
                            />
                          </label>

                          <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            Solution Classification
                            <select
                              required
                              name="solution_type"
                              value={form.solution_type}
                              onChange={change}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                              }}
                            >
                              {(p.solution_types || []).map((t) => (
                                <option key={t} value={t}>
                                  {t.replaceAll('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                          <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            Faculty / Mentor Team Member (Optional)
                            <select
                              name="mentor_member_id"
                              value={form.mentor_member_id}
                              onChange={change}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                              }}
                            >
                              <option value="">External faculty or advisory mentor</option>
                              {mentors.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} · {m.branch}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                            Mentor Name (If outside squad)
                            <input
                              name="mentor_name"
                              value={form.mentor_name}
                              onChange={change}
                              placeholder="e.g. Prof. R. Patel, Dept of Mechanical Eng"
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                              }}
                            />
                          </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                            * Mentorship is recorded for academic records; no formal pre-approval needed.
                          </span>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSelected(null);
                                setForm(emptyForm);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={busy}>
                              {busy ? 'Submitting…' : 'Submit Proposal'}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
