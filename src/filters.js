// Search terms sent to the API. The search itself is fuzzy/semantic, so this
// list only needs to be broad enough to surface candidates — precision comes
// from the patterns below.
export const SEARCH_QUERIES = [
  "nurse practitioner",
  "APRN",
  "Advanced Practice Provider",
  "APP",
  "NP",
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
];

const PEDIATRIC_PATTERNS = [
  /pediatric/i,
  /paediatric/i,
  /pediatrician/i,
  /\bpeds\b/i,
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

function collectMatches(text, patterns) {
  const matches = new Set();
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) matches.add(m[0]);
  }
  return [...matches];
}

/** Returns the actual substrings of the title that indicate an NP/APRN role, or []. */
export function matchRoleTerms(title) {
  return collectMatches(title ?? "", ROLE_PATTERNS);
}

/** Returns the actual substrings (from title or description) that indicate pediatrics, or []. */
export function matchPediatricTerms(title, description) {
  const text = `${title ?? ""} ${stripHtml(description)}`;
  return collectMatches(text, PEDIATRIC_PATTERNS);
}
