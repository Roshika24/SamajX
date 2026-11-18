const PROBLEM_TRANSITIONS = {
  reported: {
    open_for_applications: { roles: ['system'] },
    unrouted:              { roles: ['system'] },
    resolved_duplicate:    { roles: ['system', 'platform_admin'] },
    rejected_spam:         { roles: ['platform_admin'] },
  },
  open_for_applications: {
    window_closed:  { roles: ['system'] },
    rejected_spam:  { roles: ['platform_admin'] },
  },
  window_closed: {
    pending_approval:      { roles: ['system'] },
    open_for_applications: { roles: ['system'] }, // no applicants → reopen
  },
  pending_approval: {
    claimed:               { roles: ['university_admin'] },
    pending_approval:      { roles: ['system'] }, // rejected → next team
    open_for_applications: { roles: ['system'] }, // all exhausted → reopen
  },
  claimed: {
    in_progress: { roles: ['leader'] },
  },
  in_progress: {
    completed: { roles: ['university_admin'] },
    reopened:  { roles: ['system'] },
  },
  reopened: {
    pending_approval:      { roles: ['system'] },
    open_for_applications: { roles: ['system'] },
  },
  unrouted: {
    open_for_applications: { roles: ['platform_admin'] },
  },
  resolved_duplicate: {
    reported: { roles: ['platform_admin'] }, // split
  },
};

const APPLICATION_TRANSITIONS = {
  submitted: {
    ranked:    { roles: ['system'] },
    withdrawn: { roles: ['leader'] },
  },
  ranked: {
    selected:     { roles: ['system'] },
    not_selected: { roles: ['system'] },
  },
  selected: {
    approved: { roles: ['university_admin'] },
    rejected: { roles: ['university_admin'] },
  },
  not_selected: {
    selected: { roles: ['system'] }, // previous selected rejected
  },
};

const PROJECT_TRANSITIONS = {
  pending_approval: {
    active: { roles: ['system'] },
  },
  active: {
    submitted_for_review: { roles: ['leader'] },
    reopened:             { roles: ['system'] },
  },
  submitted_for_review: {
    completed: { roles: ['university_admin'] },
    active:    { roles: ['university_admin'] }, // send back for revisions
  },
};

const SPONSORSHIP_TRANSITIONS = {
  pledged: {
    confirmed: { roles: ['company'] },
    cancelled: { roles: ['company', 'platform_admin'] },
  },
  confirmed: {
    fulfilled: { roles: ['company', 'platform_admin'] },
    cancelled: { roles: ['company', 'platform_admin'] },
  },
};

const LEADER_TRANSITIONS = {
  pending: {
    approved: { roles: ['university_admin'] },
    rejected: { roles: ['university_admin'] },
  },
  approved: {
    suspended: { roles: ['university_admin', 'platform_admin'] },
  },
  suspended: {
    approved: { roles: ['university_admin'] },
  },
};


const MACHINES = {
  problem:     { transitions: PROBLEM_TRANSITIONS,     table: 'problems',     statusColumn: 'status' },
  application: { transitions: APPLICATION_TRANSITIONS, table: 'applications', statusColumn: 'status' },
  project:     { transitions: PROJECT_TRANSITIONS,     table: 'projects',     statusColumn: 'status' },
  sponsorship: { transitions: SPONSORSHIP_TRANSITIONS, table: 'sponsorships', statusColumn: 'status' },
  leader:      { transitions: LEADER_TRANSITIONS,      table: 'leaders',      statusColumn: 'status' },
};


function canTransition(entityType, from, to, actorRole) {
  const machine = MACHINES[entityType];
  if (!machine) return { allowed: false, error: `Unknown entity type: ${entityType}` };

  const fromMap = machine.transitions[from];
  if (!fromMap || !fromMap[to]) {
    return { allowed: false, error: `Cannot transition ${entityType} from "${from}" to "${to}"` };
  }

  if (!fromMap[to].roles.includes(actorRole)) {
    return { allowed: false, error: `Role "${actorRole}" cannot trigger this transition` };
  }

  return { allowed: true };
}

module.exports = { MACHINES, canTransition };
