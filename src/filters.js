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

/** Returns the actual substrings of the title that indicate an NP/APRN-adjacent role, or []. */
export function matchRoleTerms(title) {
  return collectMatches(title ?? "", ROLE_PATTERNS);
}

/** Returns the actual substrings (from title or description) that indicate pediatrics, or []. */
export function matchPediatricTerms(title, description) {
  const text = stripCertificationBoilerplate(`${title ?? ""} ${stripHtml(description)}`);
  return collectMatches(text, PEDIATRIC_PATTERNS);
}
