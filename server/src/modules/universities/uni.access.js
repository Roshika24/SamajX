/** Visibility policy for university records. */
function canViewUniversity(actor, university, ownUniversityId = null) {
  if (!actor || !university) return false;
  if (university.verified) return true;
  if (actor.role === 'platform_admin') return true;
  return actor.role === 'university_admin' && Number(ownUniversityId) === Number(university.id);
}

module.exports = { canViewUniversity };
