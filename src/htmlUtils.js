// New Relic Browser Agent — intentionally pointed at the staging beacon
// rather than production. Lives in source (not hand-edited into the
// generated HTML) so it survives every `npm run scrape` regeneration.
export const NEW_RELIC_SNIPPET = `<script type="text/javascript">
  ;window.NREUM||(NREUM={});NREUM.init={browser_consent_mode:{enabled:false},privacy:{cookies_enabled:true},session_replay:{enabled:true,block_selector:'',mask_text_selector:'*',sampling_rate:100.0,error_sampling_rate:100.0,mask_all_inputs:true,collect_fonts:true,inline_images:false,inline_stylesheet:true,fix_stylesheets:true,preload:false,mask_input_options:{}},distributed_tracing:{enabled:true},performance:{capture_measures:true},ajax:{deny_list:["staging-bam-cell.nr-data.net"],capture_payloads:'none'}};
  ;NREUM.loader_config={accountID:"550352",trustKey:"1",agentID:"345683485",licenseKey:"NRBR-e61e490de4259bb2686",applicationID:"345683485"};
  ;NREUM.info={beacon:"staging-bam-cell.nr-data.net",errorBeacon:"staging-bam-cell.nr-data.net",licenseKey:"NRBR-e61e490de4259bb2686",applicationID:"345683485",sa:1};
</script>
<script src="https://js-agent.newrelic.com/nr-loader-spa-1.x.x.min.js" type="text/javascript"></script>`;

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

// Server-rendered fallback (shown until the inline script below replaces it,
// and shown as-is if JS is unavailable). Fixed to UTC since the page is
// generated on whatever machine/runner happens to run it — the viewer's
// actual timezone isn't known until it renders in their browser.
export function formatTimestamp(date = new Date()) {
  return (
    date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC"
  );
}

// Renders the generated-at time in whatever timezone the viewer's own
// browser is set to, since this is a static page that could be generated on
// a GitHub Actions runner (UTC) but viewed anywhere.
export function renderGeneratedTimestamp(date = new Date()) {
  const iso = date.toISOString();
  const fallback = formatTimestamp(date);
  return (
    `<span id="generated-time" data-utc="${iso}">${escapeHtml(fallback)}</span>` +
    `<script>(function(){` +
    `var el=document.getElementById("generated-time");` +
    `if(!el)return;` +
    `var d=new Date(el.getAttribute("data-utc"));` +
    `if(isNaN(d))return;` +
    `var dt=d.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});` +
    `var tzParts=new Intl.DateTimeFormat(undefined,{timeZoneName:"short"}).formatToParts(d);` +
    `var tz=(tzParts.find(function(p){return p.type==="timeZoneName"})||{}).value||"";` +
    `el.textContent=dt+(tz?" "+tz:"");` +
    `})();</script>`
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
// consistent. Dark theme throughout — each labeled section keeps its own
// accent color (tinted dark background + brighter border/label) so the eye
// can still jump straight to, say, dates or "why it matched" without
// reading prose.
export const CARD_STYLES = `
  a { color: #6cb1ff; }
  .job { border: 1px solid #30363d; border-radius: 8px; padding: 0.9rem 1.1rem; margin-bottom: 0.9rem; background: #161b22; }
  .job.closed { opacity: 0.6; }
  .excluded-section { background: #201515; border: 1px solid #4a2e2e; border-radius: 10px; padding: 0.75rem 1.1rem 1.1rem; margin-top: 1rem; }
  .excluded-section summary { color: #e59a9a; }
  .excluded-section .job { border-color: #3d2828; background: #1a1212; }
  .job h3 { margin: 0 0 0.6rem; padding-bottom: 0.5rem; font-size: 1.05rem; border-bottom: 1px solid #30363d; color: #e6edf3; }
  .section { padding: 0.35rem 0.6rem; margin: 0.4rem 0; border-radius: 6px; border-left: 4px solid; font-size: 0.85rem; color: #cdd5dd; }
  .section-label { display: block; font-weight: 700; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; margin-bottom: 0.15rem; }
  .section-details { background: #10233c; border-color: #4c8eff; }
  .section-details .section-label { color: #86b6ff; }
  .section-dates { background: #362a13; border-color: #e0a030; }
  .section-dates .section-label { color: #f0c179; }
  .section-why { background: #113321; border-color: #3fbd6a; }
  .section-why .section-label { color: #7fe3a0; }
  .section-reason { background: #391414; border-color: #e05252; }
  .section-reason .section-label { color: #ff9d9d; }
  .section-bonus { background: #2a1a3d; border-color: #a06ee0; }
  .section-bonus .section-label { color: #cba3f0; }
  .apply-link { display: inline-block; margin-top: 0.5rem; padding: 0.4rem 0.85rem; background: #2f6feb; color: #fff !important; border-radius: 6px; font-size: 0.85rem; text-decoration: none; font-weight: 600; }
  .apply-link:hover { background: #1f4fb0; }
  .badge { font-size: 0.7rem; font-weight: 600; padding: 0.1rem 0.45rem; border-radius: 4px; vertical-align: middle; }
  .badge.new { background: #113321; color: #7fe3a0; }
  .badge.updated { background: #362a13; color: #f0c179; }
  .badge.closed { background: #262c33; color: #9aa4af; }
  .badge.fit-great { background: #1b2f6b; color: #a9c2ff; }
  .badge.fit-good { background: #10233c; color: #86b6ff; }
  .badge.fit-fair { background: #362a13; color: #e3ad5f; }
  .badge.fit-possible { background: #262c33; color: #9aa4af; }
`;
