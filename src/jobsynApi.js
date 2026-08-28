const API_BASE = "https://prod-search-api.jobsyn.org/api/v1/google-talent/search";
const ORIGIN = "employment.utah.edu";
const PAGE_SIZE = 40;

// Safety cap so a bug (or an API change) can't spin the app into an unbounded crawl.
const MAX_PAGES_PER_QUERY = 25;

async function fetchPage(query, page) {
  const url = `${API_BASE}?q=${encodeURIComponent(query)}&page=${page}&num_items=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Origin": ORIGIN,
    },
  });
  if (!res.ok) {
    throw new Error(`jobsyn API request failed (${res.status}) for query "${query}" page ${page}`);
  }
  return res.json();
}

/**
 * Fetches every page of results for a single search query.
 * Returns the raw list of `{ job }` entries from the API.
 */
export async function searchAllPages(query) {
  const results = [];
  let page = 1;

  while (page <= MAX_PAGES_PER_QUERY) {
    const data = await fetchPage(query, page);
    results.push(...(data.jobs ?? []));

    if (!data.pagination?.has_more_pages) break;
    page += 1;
  }

  return results;
}
