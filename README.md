# U of U Pediatric NP/APRN Job Tracker

Tracks pediatric Nurse Practitioner / APRN job postings at the University of
Utah (`employment.utah.edu`), which only shows a bare title in its list view.
Queries the site's underlying JSON API directly, filters for pediatric
NP/APRN roles, and keeps a running record so re-runs update existing postings
instead of duplicating them and mark postings that disappear as closed.

Live report: see the repo's GitHub Pages site (Settings &rarr; Pages for the URL).

## Run locally

```
npm run scrape
```

Updates `data/jobs.json` (the persistent record) and regenerates
`docs/index.html` (open it in a browser) and `docs/evaluated.html` (every
posting evaluated this run, included or excluded, and why).

## Automated runs

`.github/workflows/scrape.yml` runs this hourly via GitHub Actions and
commits any changes back to the repo. GitHub Pages serves `docs/` so the
report stays up to date without any manual step. Trigger it on demand from
the Actions tab ("Run workflow").
