import { writeFile } from "node:fs/promises";
import { escapeHtml, badge, renderMatchedTerms } from "./htmlUtils.js";

const EVALUATED_PATH = new URL("../docs/evaluated.html", import.meta.url);

function exclusionReason(entry) {
  const missingRole = entry.matchedRoleTerms.length === 0;
  const missingPediatric = entry.matchedPediatricTerms.length === 0;
  if (missingRole && missingPediatric) return "No NP/APRN role match, no pediatric match";
  if (missingRole) return "No NP/APRN role match in title";
  if (missingPediatric) return "No pediatric term in title/description";
  return "";
}

function renderEntry(entry) {
  const meta = [entry.organization, entry.department, entry.location]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &middot; ");

  const matched = [
    renderMatchedTerms("Matched role", entry.matchedRoleTerms),
    renderMatchedTerms("Matched pediatric", entry.matchedPediatricTerms),
  ]
    .filter(Boolean)
    .join(" &middot; ");

  return `
    <article class="job ${entry.included ? "included" : "excluded"}">
      <h3>${escapeHtml(entry.title)} ${entry.included ? badge("Included", "new") : badge("Excluded", "closed")}</h3>
      <p class="meta">${meta} &middot; found via "${escapeHtml(entry.foundVia)}"</p>
      ${matched ? `<p class="why">${matched}</p>` : ""}
      ${!entry.included ? `<p class="reason">${escapeHtml(exclusionReason(entry))}</p>` : ""}
      ${entry.applyUrl ? `<p><a href="${escapeHtml(entry.applyUrl)}" target="_blank" rel="noopener">View posting &rarr;</a></p>` : ""}
    </article>
  `;
}

/**
 * Writes a snapshot of every posting the API returned this run, whether it
 * was included in the tracked store or excluded, and why. Not persisted
 * across runs — this reflects only the run that just completed.
 */
export async function writeEvaluatedReport(evaluated) {
  const included = evaluated.filter((e) => e.included);
  const excluded = evaluated.filter((e) => !e.included);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Evaluated Postings &mdash; U of U NP/APRN Search</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; }
  .generated { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .back-link { display: inline-block; margin-bottom: 1.5rem; font-size: 0.85rem; }
  .job { border: 1px solid #ddd; border-radius: 8px; padding: 0.9rem 1.1rem; margin-bottom: 0.8rem; }
  .job.excluded { opacity: 0.7; }
  .job h3 { margin: 0 0 0.3rem; font-size: 1.05rem; }
  .meta, .why, .reason { margin: 0.2rem 0; font-size: 0.9rem; color: #444; }
  .why { font-size: 0.82rem; color: #555; }
  .reason { font-size: 0.82rem; color: #a33; font-style: italic; }
  .badge { font-size: 0.7rem; font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 4px; vertical-align: middle; }
  .badge.new { background: #d4f7dc; color: #146c2e; }
  .badge.closed { background: #eee; color: #666; }
  details summary { cursor: pointer; font-weight: 600; margin: 1.5rem 0 0.8rem; }
</style>
</head>
<body>
  <h1>Evaluated Postings &mdash; This Run</h1>
  <p class="generated">
    Generated ${escapeHtml(new Date().toISOString())} &middot;
    ${evaluated.length} unique posting(s) evaluated across all search queries &middot;
    ${included.length} included &middot; ${excluded.length} excluded
  </p>
  <p class="back-link"><a href="index.html">&larr; Back to tracked jobs report</a></p>

  <h2>Included (${included.length})</h2>
  ${included.map(renderEntry).join("\n") || "<p>None.</p>"}

  <details open>
    <summary>Excluded (${excluded.length})</summary>
    ${excluded.map(renderEntry).join("\n") || "<p>None.</p>"}
  </details>
</body>
</html>
`;

  await writeFile(EVALUATED_PATH, html, "utf8");
}
