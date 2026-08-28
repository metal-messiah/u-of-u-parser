import { searchAllPages } from "./jobsynApi.js";
import { matchRoleTerms, matchPediatricTerms, SEARCH_QUERIES } from "./filters.js";
import { loadStore, saveStore, normalizeJob, mergeJobs } from "./store.js";
import { writeReport } from "./report.js";
import { writeEvaluatedReport } from "./evaluatedReport.js";

/**
 * Fetches every candidate from every search query and evaluates each one
 * against the role/pediatric filters, regardless of whether it passes.
 * De-duplicated by reqid across queries (a job can surface under multiple
 * search terms). Returns the full evaluated pool, included and excluded.
 */
async function evaluateCandidates() {
  const evaluated = new Map();

  for (const query of SEARCH_QUERIES) {
    console.log(`Searching "${query}"...`);
    const entries = await searchAllPages(query);

    for (const entry of entries) {
      const job = normalizeJob(entry);
      if (!job.reqid || evaluated.has(job.reqid)) continue;

      const matchedRoleTerms = matchRoleTerms(job.title);
      const matchedPediatricTerms = matchPediatricTerms(job.title, job.description);
      const included = matchedRoleTerms.length > 0 && matchedPediatricTerms.length > 0;

      evaluated.set(job.reqid, {
        ...job,
        matchedRoleTerms,
        matchedPediatricTerms,
        included,
        foundVia: query,
      });
    }
  }

  return [...evaluated.values()];
}

async function main() {
  const startedAt = new Date().toISOString();

  const evaluated = await evaluateCandidates();
  const candidates = evaluated.filter((e) => e.included);
  console.log(
    `Evaluated ${evaluated.length} unique posting(s); ${candidates.length} matched both filters.`
  );

  const store = await loadStore();
  const { store: mergedStore, summary } = mergeJobs(store, candidates);
  await saveStore(mergedStore);

  const openCount = Object.values(mergedStore).filter((j) => j.status === "open").length;
  await writeReport(mergedStore, { ...summary, startedAt });
  await writeEvaluatedReport(evaluated);

  console.log(
    `${summary.added} new, ${summary.updated} updated, ${summary.reopened} reopened, ` +
      `${summary.closed} closed this run, ${openCount} open total.`
  );
  console.log("Report written to report.html (see evaluated.html for excluded postings)");
}

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exitCode = 1;
});
