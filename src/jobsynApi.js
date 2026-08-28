const API_BASE = "https://prod-search-api.jobsyn.org/api/v1/google-talent/search";
const ORIGIN = "employment.utah.edu";
const PAGE_SIZE = 40;

// Safety cap so a bug (or an API change) can't spin the app into an unbounded crawl.
const MAX_PAGES_PER_QUERY = 25;

// The backend behind this API occasionally returns a transient 5xx (seen in
// practice on a handful of requests per run) — retry a few times with
// backoff before giving up, since this runs unattended on an hourly schedule
// and one flaky response shouldn't fail the whole run.
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(query, page) {
  const url = `${API_BASE}?q=${encodeURIComponent(query)}&page=${page}&num_items=${PAGE_SIZE}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Origin": ORIGIN,
      },
    });

    if (res.ok) return res.json();

    const isRetryable = res.status >= 500;
    if (!isRetryable || attempt === MAX_RETRIES) {
      throw new Error(`jobsyn API request failed (${res.status}) for query "${query}" page ${page}`);
    }

    console.log(`  (retrying "${query}" page ${page} after ${res.status}, attempt ${attempt})`);
    await sleep(RETRY_DELAY_MS * attempt);
  }
}

/**
 * Fetches every page of results for a single search query. Returns the raw
 * list of `{ job }` entries from the API.
 *
 * If a page still fails after retries, this stops paginating that query and
 * returns whatever it already has rather than failing the whole run — a
 * partial result set for one noisy query beats an hourly automation that
 * dies every time this backend hiccups on a deep page.
 */
export async function searchAllPages(query) {
  const results = [];
  let page = 1;

  while (page <= MAX_PAGES_PER_QUERY) {
    let data;
    try {
      data = await fetchPage(query, page);
    } catch (err) {
      console.warn(`  Giving up on "${query}" after page ${page - 1}: ${err.message}`);
      break;
    }

    results.push(...(data.jobs ?? []));

    if (!data.pagination?.has_more_pages) break;
    page += 1;
  }

  return results;
}
