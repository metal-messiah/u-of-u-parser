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

`.github/workflows/scrape.yml` is scheduled hourly (`17 * * * *`) via GitHub
Actions and commits any changes back to the repo. GitHub Pages serves `docs/`
so the report stays up to date without any manual step.

In practice it runs every few hours, not hourly — GitHub does not guarantee
timing on `schedule:` triggers, and scheduled runs on a low-traffic repo sit
in a low-priority queue that's regularly delayed several hours beyond the
cron time. This is a platform limitation, not a misconfiguration, and isn't
worth working around since job postings don't change fast enough for the gap
to matter. Trigger it immediately on demand from the Actions tab ("Run
workflow") or with `gh workflow run scrape.yml`.
