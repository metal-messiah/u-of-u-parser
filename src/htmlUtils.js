export function escapeHtml(str) {
  return (str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function badge(text, className) {
  return `<span class="badge ${className}">${escapeHtml(text)}</span>`;
}

// Fixed to UTC so the timestamp reads the same whether generated on a local
// machine or a GitHub Actions runner, rather than showing whatever timezone
// each happens to be in.
export function formatTimestamp(date = new Date()) {
  return (
    date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC"
  );
}

/** A labeled, color-coded block inside a job card. Omitted entirely if contentHtml is empty. */
export function section(kind, label, contentHtml) {
  if (!contentHtml) return "";
  return `<div class="section section-${kind}"><span class="section-label">${escapeHtml(label)}</span>${contentHtml}</div>`;
}

export function renderMatchedLine(label, terms) {
  if (!terms?.length) return "";
  return `<div><strong>${escapeHtml(label)}:</strong> ${terms.map(escapeHtml).join(", ")}</div>`;
}

// Shared by report.js and evaluatedReport.js so both pages' cards look
// consistent. Each labeled section gets its own accent color so the eye can
// jump straight to, say, dates or "why it matched" without reading prose.
export const CARD_STYLES = `
  .job { border: 1px solid #ddd; border-radius: 8px; padding: 0.9rem 1.1rem; margin-bottom: 0.9rem; background: #fff; }
  .job.closed { opacity: 0.6; }
  .excluded-section { background: #f6ecec; border: 1px solid #e3caca; border-radius: 10px; padding: 0.75rem 1.1rem 1.1rem; margin-top: 1rem; }
  .excluded-section summary { color: #7a2f2f; }
  .excluded-section .job { border-color: #e3caca; }
  .job h3 { margin: 0 0 0.6rem; padding-bottom: 0.5rem; font-size: 1.05rem; border-bottom: 1px solid #eee; }
  .section { padding: 0.35rem 0.6rem; margin: 0.4rem 0; border-radius: 6px; border-left: 4px solid; font-size: 0.85rem; color: #333; }
  .section-label { display: block; font-weight: 700; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; margin-bottom: 0.15rem; }
  .section-details { background: #eef4fc; border-color: #4c7fd6; }
  .section-details .section-label { color: #2f5aa8; }
  .section-dates { background: #fdf3e7; border-color: #d98f2b; }
  .section-dates .section-label { color: #a15f0d; }
  .section-why { background: #eaf7ee; border-color: #3fa35a; }
  .section-why .section-label { color: #227a3c; }
  .section-reason { background: #fbeaea; border-color: #cc4b4b; }
  .section-reason .section-label { color: #a12f2f; }
  .apply-link { display: inline-block; margin-top: 0.5rem; padding: 0.4rem 0.85rem; background: #2f5aa8; color: #fff !important; border-radius: 6px; font-size: 0.85rem; text-decoration: none; font-weight: 600; }
  .apply-link:hover { background: #24457f; }
  .badge { font-size: 0.7rem; font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 4px; vertical-align: middle; }
  .badge.new { background: #d4f7dc; color: #146c2e; }
  .badge.updated { background: #fff3cd; color: #8a6100; }
  .badge.closed { background: #eee; color: #666; }
`;
