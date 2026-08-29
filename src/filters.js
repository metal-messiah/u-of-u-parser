// Search terms sent to the API. The search itself is fuzzy/semantic, so this
// list only needs to be broad enough to surface candidates — precision comes
// from the patterns below. Beyond direct "Nurse Practitioner" titles, this
// also covers adjacent advanced-practice-nursing roles a pediatric NP is
// commonly qualified for (case management, clinical research, education,
// utilization review, nurse navigation) — roles a hospital/academic health
// system like this one actually posts. (Things like medical device/pharma
// sales reps also hire NPs, but that's not a role this specific employer's
// careers site would ever list, so there's no query for it here.)
export const SEARCH_QUERIES = [
  "nurse practitioner",
  "APRN",
  "Advanced Practice Provider",
  "APP",
  "NP",
  "PNP",
  "Clinical Nurse Specialist",
  "Nurse Educator",
  "Case Manager",
  "Care Coordinator",
  "Utilization Review",
  "Clinical Research Coordinator",
  "Nurse Navigator",
  "Professor",
  "Faculty",
];

// Matched against the job TITLE only (not the description) — U of U Health
// postings share a lot of boilerplate description text that incidentally
// contains words like "app" or "np", which made description-matching too
// noisy. Titles reliably state the role.
//
// \b[A-Za-z]{0,4}NP\b catches short NP-role abbreviations that appear as a
// single token, e.g. FNP, PNP, PMHNP, NNP, ACNP, AGNP, as well as bare "NP".
const ROLE_PATTERNS = [
  /nurse practitioner/i,
  /\baprn\b/i,
  /advanced practice provider/i,
  /advanced practice clinician/i,
  /\b[A-Za-z]{0,4}NP\b/i,
  /clinical nurse specialist/i,
  /\bcns\b/i,
  /nurse educator/i,
  /case manager/i,
  /care coordinator/i,
  /utilization review/i,
  /clinical research (coordinator|nurse)/i,
  /nurse navigator/i,
  /nurse consultant/i,
];

// "Professor"/"Faculty"/"Instructor" on their own would pull in a flood of
// physician-only academic postings (this is a medical school). They only
// count as NP-relevant when the posting is specifically within the College
// of Nursing — checked separately via the department code, since title alone
// can't distinguish "Assistant Professor (Clinical)" in Surgery from the
// same title in the College of Nursing.
const ACADEMIC_TITLE_PATTERNS = [/professor/i, /\bfaculty\b/i, /\binstructor\b/i, /\blecturer\b/i, /endowed chair/i];
const COLLEGE_OF_NURSING_DEPT = /\bCON\b/;

// PNP (Pediatric Nurse Practitioner) is itself a pediatric signal, so a title
// that's just "PNP" with no other pediatric wording should still count.
const PEDIATRIC_PATTERNS = [
  /pediatric/i,
  /paediatric/i,
  /pediatrician/i,
  /\bpeds\b/i,
  /\bpnp\b/i,
  /neonatal/i,
  /neonate/i,
  /\bnicu\b/i,
  /\bpicu\b/i,
  /infant/i,
  /\bchild(ren)?\b/i,
  /adolescent/i,
  /\byouth\b/i,
];

function stripHtml(html) {
  return (html ?? "").replace(/<[^>]*>/g, " ");
}

// These certification names are boilerplate on almost any acute-care nursing
// posting (adult units included) and shouldn't count as evidence the role
// itself is pediatric — strip them before pediatric matching.
const CERTIFICATION_BOILERPLATE = [
  /pediatric advanced life support( \(pals\))?/gi,
  /\bpals\b/gi,
  /neonatal resuscitation program( \(nrp\))?/gi,
  /\bnrp\b/gi,
];

function stripCertificationBoilerplate(text) {
  return CERTIFICATION_BOILERPLATE.reduce((acc, pattern) => acc.replace(pattern, " "), text);
}

function collectMatches(text, patterns) {
  const matches = new Set();
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) matches.add(m[0]);
  }
  return [...matches];
}

/**
 * Returns the actual substrings of the title that indicate an NP/APRN-adjacent
 * role, or []. Academic titles (Professor/Faculty/Instructor/Lecturer) only
 * count when `department` shows the posting is within the College of Nursing
 * (dept code "CON") — otherwise this would match physician faculty postings
 * that have nothing to do with nurse practitioners.
 */
export function matchRoleTerms(title, department) {
  const direct = collectMatches(title ?? "", ROLE_PATTERNS);
  if (direct.length) return direct;

  const isAcademicTitle = ACADEMIC_TITLE_PATTERNS.some((pattern) => pattern.test(title ?? ""));
  const isNursingDept = COLLEGE_OF_NURSING_DEPT.test(department ?? "");
  if (isAcademicTitle && isNursingDept) return ["Nursing faculty (College of Nursing)"];

  return [];
}

/** Returns the actual substrings (from title or description) that indicate pediatrics, or []. */
export function matchPediatricTerms(title, description) {
  const text = stripCertificationBoilerplate(`${title ?? ""} ${stripHtml(description)}`);
  return collectMatches(text, PEDIATRIC_PATTERNS);
}

// --- Match scoring -----------------------------------------------------
//
// Ranks how close a posting is to a "perfect match" for a dual-certified
// Pediatric NP (Acute Care/Primary Care) — not just whether it clears the
// role+pediatric bar, but how strong a fit it is. Role type dominates the
// score (a direct NP posting always outranks a Clinical Research
// Coordinator posting), with pediatric-term richness and specialty-area
// overlap as finer-grained tiebreakers within and near a tier.
const CORE_NP_PATTERN = /nurse practitioner|\baprn\b|advanced practice provider|advanced practice clinician|\b[A-Za-z]{0,4}NP\b/i;
const CLINICAL_RESEARCH_PATTERN = /clinical research/i;

function roleWeight(matchedRoleTerms) {
  if (matchedRoleTerms.some((t) => CORE_NP_PATTERN.test(t))) return 5; // direct NP/APRN posting
  if (matchedRoleTerms.some((t) => /nursing faculty/i.test(t))) return 4; // College of Nursing faculty/adjunct
  if (matchedRoleTerms.some((t) => CLINICAL_RESEARCH_PATTERN.test(t))) return 1; // lowest tier, but still acceptable
  if (matchedRoleTerms.length) return 2; // other adjacent nursing roles (case manager, educator, etc.)
  return 0;
}

// Specialty areas from the specific candidate's background (acute + primary
// care pediatric NP, ED, interventional radiology/fluoroscopy, procedural
// care, DNP-level practice) — a posting that overlaps these is a better fit
// for THIS candidate than a generically pediatric one.
const RESUME_AFFINITY_PATTERNS = [
  /acute care/i,
  /primary care/i,
  /emergency department/i,
  /\bed\b/i,
  /interventional radiology/i,
  /fluoroscop/i,
  /procedural/i,
  /case management/i,
  /\bdnp\b/i,
  /dual.certif/i,
  /outpatient/i,
  /newborn/i,
];

/** Returns the substrings matching this candidate's specific specialty background, or []. */
export function matchResumeAffinityTerms(title, description) {
  const text = `${title ?? ""} ${stripHtml(description)}`;
  return collectMatches(text, RESUME_AFFINITY_PATTERNS);
}

// Lifestyle perks worth a real boost, independent of pediatric/role fit:
// day shift (checked against the site's own structured "Shift" field, not
// free text — more reliable), a compressed full-time schedule (fewer than
// 5 days/week), and procedural work/assisting with procedures.
const COMPRESSED_SCHEDULE_PATTERNS = [
  /compressed/i,
  /\d\s*x\s*(10|12)\b/i,
  /(three|four|3|4)[\s-]*(10|12)[- ]?hour/i,
  /\b(3|4)([\s–-]\d)?\s+days?\s+per\s+week/i,
];
const PROCEDURAL_PATTERNS = [/procedural/i, /assist(s|ing)?\s+(with\s+)?(procedures|physicians)/i, /image[- ]guided/i];

function isCompressedFullTimeSchedule(job) {
  if (!/full.?time/i.test(job.employmentType ?? "")) return false;
  const text = `${job.workScheduleSummary ?? ""} ${stripHtml(job.description)}`;
  return COMPRESSED_SCHEDULE_PATTERNS.some((p) => p.test(text));
}

function isDayShift(job) {
  return /^day$/i.test((job.shift ?? "").trim());
}

function isProcedural(job) {
  const text = `${job.title ?? ""} ${stripHtml(job.description)}`;
  return PROCEDURAL_PATTERNS.some((p) => p.test(text));
}

/** Returns the lifestyle-perk labels a posting qualifies for, or []. */
export function matchBonusTerms(job) {
  const bonuses = [];
  if (isDayShift(job)) bonuses.push("Day shift");
  if (isProcedural(job)) bonuses.push("Procedural / assists with procedures");
  if (isCompressedFullTimeSchedule(job)) bonuses.push("Full-time, condensed schedule");
  return bonuses;
}

/**
 * Combines role tier, pediatric-term richness, specialty-area overlap, and
 * lifestyle-perk bonuses into a single sortable score. Role tier is weighted
 * an order of magnitude above the others so it always dominates: any NP
 * posting outranks any Clinical Research Coordinator posting regardless of
 * term counts or perks.
 */
export function scoreMatch({ matchedRoleTerms, matchedPediatricTerms, matchedResumeAffinityTerms, matchedBonusTerms }) {
  return (
    roleWeight(matchedRoleTerms ?? []) * 10 +
    (matchedPediatricTerms?.length ?? 0) +
    (matchedResumeAffinityTerms?.length ?? 0) * 0.5 +
    (matchedBonusTerms?.length ?? 0) * 3
  );
}

/** Human-readable fit label for the score's role tier, shown on the report. */
export function fitLabel(matchedRoleTerms) {
  const weight = roleWeight(matchedRoleTerms ?? []);
  if (weight >= 5) return "Great fit";
  if (weight >= 4) return "Good fit";
  if (weight >= 2) return "Fair fit";
  return "Possible fit";
}
