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

export function renderMatchedTerms(label, terms) {
  if (!terms?.length) return "";
  return `<span class="matched"><strong>${escapeHtml(label)}:</strong> ${terms.map(escapeHtml).join(", ")}</span>`;
}
