import { writeFile } from "node:fs/promises";
import { escapeHtml, badge, renderMatchedTerms } from "./htmlUtils.js";

const REPORT_PATH = new URL("../docs/index.html", import.meta.url);

function renderJobCard(job, { isNew, isUpdated }) {
  const badges = [
    isNew ? badge("New", "new") : "",
    isUpdated ? badge("Updated", "updated") : "",
    job.status === "closed" ? badge("Closed", "closed") : "",
  ].join(" ");

  const meta = [job.organization, job.department, job.location, job.employmentType, job.payRange]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &middot; ");

  const dates = [
    job.openDate ? `Opened ${escapeHtml(job.openDate)}` : "",
    job.closeDate ? `Closes ${escapeHtml(job.closeDate)}` : "",
    job.closedAt ? `Removed from site ${escapeHtml(job.closedAt.slice(0, 10))}` : "",
  ]
    .filter(Boolean)
    .join(" &middot; ");

  const matched = [
    renderMatchedTerms("Matched role", job.matchedRoleTerms),
    renderMatchedTerms("Matched pediatric", job.matchedPediatricTerms),
  ]
    .filter(Boolean)
    .join(" &middot; ");

  return `
    <article class="job ${job.status}">
      <h3>${escapeHtml(job.title)} ${badges}</h3>
      <p class="meta">${meta}</p>
      <p class="dates">${dates}</p>
      ${matched ? `<p class="why">${matched}</p>` : ""}
      ${job.applyUrl ? `<p><a href="${escapeHtml(job.applyUrl)}" target="_blank" rel="noopener">View / apply &rarr;</a></p>` : ""}
    </article>
  `;
}

export async function writeReport(store, runSummary) {
  const jobs = Object.values(store).sort(
    (a, b) => new Date(b.firstSeenAt) - new Date(a.firstSeenAt)
  );

  const open = jobs.filter((j) => j.status === "open");
  const closed = jobs.filter((j) => j.status === "closed");

  const runStartedAt = runSummary.startedAt;
  const isNew = (job) => job.firstSeenAt === job.lastSeenAt && job.firstSeenAt >= runStartedAt;
  const isUpdated = (job) => job.updatedAt && job.updatedAt >= runStartedAt;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>U of U Pediatric NP/APRN Jobs</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; }
  .generated { color: #666; font-size: 0.85rem; margin-bottom: 0.5rem; }
  .evaluated-link { display: inline-block; margin-bottom: 1.5rem; font-size: 0.85rem; }
  .job { border: 1px solid #ddd; border-radius: 8px; padding: 0.9rem 1.1rem; margin-bottom: 0.8rem; }
  .job.closed { opacity: 0.55; }
  .job h3 { margin: 0 0 0.3rem; font-size: 1.05rem; }
  .meta, .dates, .why { margin: 0.2rem 0; font-size: 0.9rem; color: #444; }
  .why { color: #555; font-size: 0.82rem; }
  .badge { font-size: 0.7rem; font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 4px; vertical-align: middle; }
  .badge.new { background: #d4f7dc; color: #146c2e; }
  .badge.updated { background: #fff3cd; color: #8a6100; }
  .badge.closed { background: #eee; color: #666; }
  details summary { cursor: pointer; font-weight: 600; margin: 1.5rem 0 0.8rem; }
</style>
</head>
<body>
  <h1>Pediatric Nurse Practitioner / APRN Jobs &mdash; University of Utah</h1>
  <p class="generated">
    Generated ${escapeHtml(new Date().toISOString())} &middot;
    ${runSummary.added} new &middot; ${runSummary.updated} updated &middot;
    ${runSummary.reopened} reopened &middot; ${runSummary.closed} closed this run &middot;
    ${open.length} currently open
  </p>
  <p class="evaluated-link"><a href="evaluated.html">See every posting evaluated this run, including excluded ones &rarr;</a></p>

  ${open.map((job) => renderJobCard(job, { isNew: isNew(job), isUpdated: isUpdated(job) })).join("\n")}

  <details>
    <summary>Closed / removed postings (${closed.length})</summary>
    ${closed.map((job) => renderJobCard(job, { isNew: false, isUpdated: false })).join("\n")}
  </details>
</body>
</html>
`;

  await writeFile(REPORT_PATH, html, "utf8");
}
