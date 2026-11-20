import { useEffect, useState, useCallback } from 'react';
import { api } from '../../utils/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import styles from './Phase4AdminPage.module.css';

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

  // Accordion state: which problem is currently expanded
  const [expandedId, setExpandedId] = useState(null);

  // Lazy-loaded AI data cache: { [problemId]: { domain: data, difficulty: data, loading: boolean, error: string } }
  const [aiCache, setAiCache] = useState({});

  // Override selectors visibility
  const [overrideDomainSelection, setOverrideDomainSelection] = useState({});
  const [overrideDiffSelection, setOverrideDiffSelection] = useState({});

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Lazy load AI details when a problem is expanded
  const fetchAIDetails = useCallback(async (problemId) => {
    // Avoid refetching if already loaded and not in error
    if (aiCache[problemId]?.loaded) return;

    setAiCache((prev) => ({
      ...prev,
      [problemId]: { ...prev[problemId], loading: true, error: null },
    }));

    try {
      const [domainRes, diffRes] = await Promise.allSettled([
        api.get(`/ai/problems/${problemId}/domain`),
        api.get(`/ai/problems/${problemId}/difficulty`),
      ]);

      const domainData = domainRes.status === 'fulfilled' ? domainRes.value.data : null;
      const diffData = diffRes.status === 'fulfilled' ? diffRes.value.data : null;

      setAiCache((prev) => ({
        ...prev,
        [problemId]: {
          domain: domainData,
          difficulty: diffData,
          loading: false,
          loaded: true,
          error: null,
        },
      }));
    } catch (err) {
      setAiCache((prev) => ({
        ...prev,
        [problemId]: {
          loading: false,
          loaded: false,
          error: err.message || 'Failed to load AI details',
        },
      }));
    }
  }, [aiCache]);

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchAIDetails(id);
    }
  };

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
      // Invalidate cache for this problem
      setAiCache((prev) => ({ ...prev, [problemId]: { loaded: false } }));
      await load();
      fetchAIDetails(problemId);
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
      setAiCache((prev) => ({ ...prev, [problemId]: { loaded: false } }));
      await load();
      fetchAIDetails(problemId);
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
      setAiCache((prev) => ({ ...prev, [problemId]: { loaded: false } }));
      await load();
      fetchAIDetails(problemId);
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
      const result = await api.patch(`/admin/phase4/problems/${id}/classification`, data);
      setNotice(
        result.data?.message ||
          `Problem #${id} classified and routed to ${result.data?.routing?.universityCount ?? 'matching'} universities.`
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

  async function runJobs() {
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

  function getStatusVariant(status) {
    switch (status?.toLowerCase()) {
      case 'open_for_applications':
        return 'success';
      case 'window_closed':
        return 'warning';
      case 'project_activated':
      case 'completed':
        return 'primary';
      case 'reported':
      default:
        return 'neutral';
    }
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <header className={styles.headerSection}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
              CIVIC WORKFLOWS & AI PIPELINE
            </span>
            <Badge variant="primary">{problems.length} Problems</Badge>
            <Badge variant="neutral">{apps.length} Proposals</Badge>
          </div>
          <h1 className={styles.headerTitle}>Lifecycle Workflows & AI Governance</h1>
          <p className={styles.headerSubtitle}>
            Audit AI domain suggestions, verify problem classifications, score eligible student proposals, and activate project deployments.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={runJobs} size="small">
            ⚙️ Run Background Jobs
          </Button>
        </div>
      </header>

      {/* Global Alerts */}
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
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-emerald-700, #047857)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>✓</span>
          <span>{notice}</span>
        </div>
      )}

      {/* SECTION 1: COMPACT PROBLEMS LIST */}
      <section style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              Civic Problems Directory ({problems.length})
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>
              Click any problem to expand details, view citizen description, and perform AI review.
            </p>
          </div>
        </div>

        <div className={styles.problemListContainer}>
          {problems.map((p) => {
            const isExpanded = expandedId === p.id;
            const aiDetail = aiCache[p.id];

            // Resolve domain values
            const domainName = p.domain_name || 'Unclassified';
            const suggestedDomainName =
              aiDetail?.domain?.suggestedDomainName ||
              (p.ai_suggested_domain_id ? domains.find((d) => d.id === p.ai_suggested_domain_id)?.name : null) ||
              'Pending Analysis';

            const domainExplanation =
              aiDetail?.domain?.explanation || p.ai_domain_explanation || '';

            const domainStatus = p.ai_domain_status || 'pending';

            // Resolve difficulty values
            const difficultyName = p.difficulty || 'No Difficulty';
            const predictedDifficulty =
              aiDetail?.difficulty?.predictedDifficulty || p.ai_suggested_difficulty || 'Pending';
            const difficultyExplanation =
              aiDetail?.difficulty?.explanation || p.ai_difficulty_reason || '';
            const difficultyStatus = p.ai_difficulty_status || 'pending';

            return (
              <div
                key={p.id}
                className={`${styles.problemRowCard} ${isExpanded ? styles.problemRowCardActive : ''}`}
              >
                {/* Compact Row Header (Always Visible) */}
                <div
                  className={styles.problemRowHeader}
                  onClick={() => toggleExpand(p.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(p.id);
                    }
                  }}
                >
                  <div className={styles.problemRowLeft}>
                    <span className={styles.problemIdBadge}>#{p.id}</span>
                    <div className={styles.problemTitleGroup}>
                      <h3 className={styles.problemTitleText}>{p.title}</h3>
                      <div className={styles.problemMetaSubtext}>
                        <Badge variant={getStatusVariant(p.status)} size="small">
                          {p.status}
                        </Badge>
                        <span>•</span>
                        <span>{domainName}</span>
                        <span>•</span>
                        <Badge variant={getDifficultyVariant(p.difficulty)} size="small">
                          {difficultyName}
                        </Badge>
                        <span>•</span>
                        <span>📍 {p.routed_universities} universities</span>
                        <span>•</span>
                        <span>👥 {p.application_count} proposals</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.problemRowRight}>
                    <button
                      type="button"
                      className={styles.expandToggleBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(p.id);
                      }}
                    >
                      <span>{isExpanded ? 'Collapse' : 'View Details & AI'}</span>
                      <span className={`${styles.chevronIcon} ${isExpanded ? styles.chevronIconOpen : ''}`}>
                        ▼
                      </span>
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className={styles.problemDetailPanel}>
                    {/* Citizen Report Description */}
                    <div className={styles.citizenDescBox}>
                      <div className={styles.citizenDescTitle}>Citizen Report Summary</div>
                      <p className={styles.citizenDescContent}>
                        {p.description || 'No description provided by the citizen.'}
                      </p>
                      <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)' }}>
                        Location: {p.lat && p.lng ? `${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}` : 'Campus Coordinates'} · Upvotes: {p.upvote_count || 0}
                      </div>
                    </div>

                    {/* AI Assistance Review Section (2 Panels) */}
                    <div className={styles.aiReviewSection}>
                      <div className={styles.aiSectionHeader}>
                        <div className={styles.aiHeaderTitle}>
                          <span>🤖</span>
                          <span>AI Assistance Review & Classification</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => reEnqueueAI(p.id)}
                            disabled={busy[`ai_q_${p.id}`]}
                          >
                            {busy[`ai_q_${p.id}`] ? 'Queueing…' : '🔄 Re-enqueue Analysis'}
                          </Button>
                        </div>
                      </div>

                      {aiDetail?.loading ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)' }}>
                          Retrieving latest AI classification and confidence scores…
                        </div>
                      ) : (
                        <div className={styles.aiGridTwoPanels}>
                          {/* PANEL A: AI DOMAIN CLASSIFICATION */}
                          <div className={styles.aiPanelCard}>
                            <div className={styles.aiPanelCardHeader}>
                              <span>Domain Classification</span>
                              <Badge
                                variant={
                                  domainStatus === 'accepted'
                                    ? 'success'
                                    : domainStatus === 'overridden'
                                    ? 'warning'
                                    : domainStatus === 'failed'
                                    ? 'danger'
                                    : 'primary'
                                }
                                size="small"
                              >
                                {domainStatus.toUpperCase()}
                              </Badge>
                            </div>

                            {/* Status State Banner */}
                            {domainStatus === 'failed' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateFailed}`}>
                                <span>⚠️ AI analysis could not be completed. Manual review is available.</span>
                              </div>
                            ) : domainStatus === 'pending' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStatePending}`}>
                                <span>⏳ AI analysis is waiting to start.</span>
                              </div>
                            ) : domainStatus === 'processing' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateProcessing}`}>
                                <span>⚡ Analyzing this problem...</span>
                              </div>
                            ) : domainStatus === 'accepted' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateReady}`}>
                                <span>✓ Accepted by Administrator</span>
                              </div>
                            ) : domainStatus === 'overridden' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStatePending}`}>
                                <span>⚡ Overridden by Administrator</span>
                              </div>
                            ) : (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateReady}`}>
                                <span>🤖 AI suggestion available for review.</span>
                              </div>
                            )}

                            <div className={styles.aiValueRow}>
                              <span className={styles.aiValueLabel}>Suggested:</span>
                              <span className={styles.aiValueBold}>{suggestedDomainName}</span>
                            </div>

                            <div className={styles.aiValueRow}>
                              <span className={styles.aiValueLabel}>Current:</span>
                              <span>{domainName}</span>
                            </div>

                            {domainExplanation && (
                              <div>
                                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-ink-muted)', marginBottom: 4, fontWeight: 600 }}>
                                  AI RATIONALE:
                                </div>
                                <p className={styles.aiExplanationBox}>{domainExplanation}</p>
                              </div>
                            )}

                            {/* Human Review Actions */}
                            <div className={styles.aiActionRow}>
                              <Button
                                size="small"
                                variant="primary"
                                onClick={() => reviewDomain(p.id, 'accept')}
                                disabled={busy[`ai_d_${p.id}`] || domainStatus === 'accepted'}
                              >
                                {domainStatus === 'accepted' ? '✓ Accepted' : '✓ Accept Domain'}
                              </Button>

                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() =>
                                  setOverrideDomainSelection((prev) => ({
                                    ...prev,
                                    [p.id]: !prev[p.id],
                                  }))
                                }
                              >
                                {overrideDomainSelection[p.id] ? 'Cancel' : 'Override Domain…'}
                              </Button>
                            </div>

                            {overrideDomainSelection[p.id] && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <select
                                  id={`override-dom-${p.id}`}
                                  className={styles.formSelect}
                                  defaultValue={p.domain_id || ''}
                                  style={{ flex: 1 }}
                                >
                                  {domains.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    const val = document.getElementById(`override-dom-${p.id}`)?.value;
                                    if (val) reviewDomain(p.id, 'override', val);
                                  }}
                                  disabled={busy[`ai_d_${p.id}`]}
                                >
                                  Apply
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* PANEL B: AI DIFFICULTY PREDICTION */}
                          <div className={styles.aiPanelCard}>
                            <div className={styles.aiPanelCardHeader}>
                              <span>Difficulty Prediction</span>
                              <Badge
                                variant={
                                  difficultyStatus === 'accepted'
                                    ? 'success'
                                    : difficultyStatus === 'overridden'
                                    ? 'warning'
                                    : difficultyStatus === 'failed'
                                    ? 'danger'
                                    : 'neutral'
                                }
                                size="small"
                              >
                                {difficultyStatus.toUpperCase()}
                              </Badge>
                            </div>

                            {/* Status State Banner */}
                            {difficultyStatus === 'failed' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateFailed}`}>
                                <span>⚠️ AI analysis could not be completed. Manual review is available.</span>
                              </div>
                            ) : difficultyStatus === 'pending' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStatePending}`}>
                                <span>⏳ AI analysis is waiting to start.</span>
                              </div>
                            ) : difficultyStatus === 'processing' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateProcessing}`}>
                                <span>⚡ Analyzing this problem...</span>
                              </div>
                            ) : difficultyStatus === 'accepted' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateReady}`}>
                                <span>✓ Accepted by Administrator</span>
                              </div>
                            ) : difficultyStatus === 'overridden' ? (
                              <div className={`${styles.aiStateBanner} ${styles.aiStatePending}`}>
                                <span>⚡ Overridden by Administrator</span>
                              </div>
                            ) : (
                              <div className={`${styles.aiStateBanner} ${styles.aiStateReady}`}>
                                <span>🤖 AI prediction available for review.</span>
                              </div>
                            )}

                            <div className={styles.aiValueRow}>
                              <span className={styles.aiValueLabel}>Predicted:</span>
                              <span className={styles.aiValueBold}>
                                <Badge variant={getDifficultyVariant(predictedDifficulty)} size="small">
                                  {predictedDifficulty?.toUpperCase()}
                                </Badge>
                              </span>
                            </div>

                            <div className={styles.aiValueRow}>
                              <span className={styles.aiValueLabel}>Current:</span>
                              <span>{difficultyName}</span>
                            </div>

                            {difficultyExplanation && (
                              <div>
                                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-ink-muted)', marginBottom: 4, fontWeight: 600 }}>
                                  COMPLEXITY RATIONALE:
                                </div>
                                <p className={styles.aiExplanationBox}>{difficultyExplanation}</p>
                              </div>
                            )}

                            {/* Human Review Actions */}
                            <div className={styles.aiActionRow}>
                              <Button
                                size="small"
                                variant="primary"
                                onClick={() => reviewDifficulty(p.id, 'accept')}
                                disabled={busy[`ai_diff_${p.id}`] || difficultyStatus === 'accepted'}
                              >
                                {difficultyStatus === 'accepted' ? '✓ Accepted' : '✓ Accept Difficulty'}
                              </Button>

                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() =>
                                  setOverrideDiffSelection((prev) => ({
                                    ...prev,
                                    [p.id]: !prev[p.id],
                                  }))
                                }
                              >
                                {overrideDiffSelection[p.id] ? 'Cancel' : 'Override Difficulty…'}
                              </Button>
                            </div>

                            {overrideDiffSelection[p.id] && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <select
                                  id={`override-diff-${p.id}`}
                                  className={styles.formSelect}
                                  defaultValue={p.difficulty || 'medium'}
                                  style={{ flex: 1 }}
                                >
                                  <option value="small">Small (Student Survey & Basic Prototyping)</option>
                                  <option value="medium">Medium (Measurement & Hardware Prototyping)</option>
                                  <option value="hard">Hard (Multi-Stakeholder / Advanced Engineering)</option>
                                </select>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    const val = document.getElementById(`override-diff-${p.id}`)?.value;
                                    if (val) reviewDifficulty(p.id, 'override', val);
                                  }}
                                  disabled={busy[`ai_diff_${p.id}`]}
                                >
                                  Apply
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Problem Classification Settings & Application Window */}
                    <details className={styles.classificationDetails}>
                      <summary className={styles.classificationSummary}>
                        ⚙️ Advanced Classification Settings & Application Window
                      </summary>

                      <form onSubmit={(e) => classify(p.id, e)} className={styles.classificationFormGrid}>
                        <div className={styles.formRow3}>
                          <label className={styles.formLabel}>
                            Difficulty Tier
                            <select
                              name="difficulty"
                              defaultValue={p.difficulty || p.ai_suggested_difficulty || 'medium'}
                              className={styles.formSelect}
                            >
                              <option value="small">Small (Survey & Basic Fieldwork)</option>
                              <option value="medium">Medium (Applied Engineering Prototype)</option>
                              <option value="hard">Hard (Complex Multi-Component Lab Deploy)</option>
                            </select>
                          </label>

                          <label className={styles.formLabel}>
                            Domain Category
                            <select
                              name="domain_id"
                              defaultValue={p.domain_id || p.ai_suggested_domain_id || ''}
                              className={styles.formSelect}
                            >
                              <option value="">Keep current ({p.domain_name || 'None'})</option>
                              {domains.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className={styles.formLabel}>
                            Application Window (Hours)
                            <input
                              name="window_hours"
                              type="number"
                              min="1"
                              max="720"
                              defaultValue="48"
                              className={styles.formInput}
                            />
                          </label>

                          <label className={styles.formLabel}>
                            Review Window (Hours)
                            <input
                              name="review_hours"
                              type="number"
                              min="1"
                              max="720"
                              defaultValue="48"
                              className={styles.formInput}
                            />
                          </label>
                        </div>

                        <label className={styles.formLabel}>
                          Required Skills & Focus (Comma-separated)
                          <input
                            name="required_skills"
                            type="text"
                            defaultValue={(p.required_skills || []).join(', ')}
                            placeholder="e.g. soil testing, civil hydrology, IoT telemetry"
                            className={styles.formInput}
                          />
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
                          <legend style={{ fontSize: 'var(--text-xs)', fontWeight: 700, padding: '0 6px' }}>
                            Allowed Solution Types
                          </legend>
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

                    {/* Window Status and Ranking Action */}
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
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: APPLICATIONS AND FINAL SELECTION */}
      <section style={{ display: 'grid', gap: 14, marginTop: 12 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
            Student Proposals & Project Activation ({apps.length})
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', margin: '2px 0 0 0' }}>
            Score proposals on technical merit, evaluate university approvals, and activate winning squad deployments.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {apps.map((a) => (
            <div key={a.id} className={styles.proposalCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
                    {a.problem_title} · Team: {a.team_name}
                  </h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-light)' }}>
                    Proposal #{a.id} · Status: <strong>{a.status}</strong>
                    {a.mentor_name && ` · Faculty Advisor: ${a.mentor_name}`}
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
                  Proposal Score (1-5):
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
                      proposal_score: Number(document.getElementById(`score-${a.id}`)?.value),
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
                    backgroundColor: 'var(--color-surface-sunken, #F8FAFC)',
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
          ))}
        </div>
      </section>
    </div>
  );
}
