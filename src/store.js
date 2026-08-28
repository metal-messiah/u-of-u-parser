import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const STORE_PATH = new URL("../data/jobs.json", import.meta.url);

function extractField(descriptionHtml, label) {
  const match = new RegExp(`<strong>${label}</strong>\\s*([^<]*)`, "i").exec(descriptionHtml ?? "");
  const value = match?.[1]?.trim();
  return value || null;
}

function hashDescription(descriptionHtml) {
  return createHash("sha256").update(descriptionHtml ?? "").digest("hex").slice(0, 16);
}

/**
 * Converts a raw jobsyn API entry into the shape we persist.
 */
export function normalizeJob(entry) {
  const job = entry.job;
  const attrs = job.customAttributes ?? {};
  const get = (key) => attrs[key]?.stringValues?.[0] ?? null;

  const description = job.description ?? "";

  return {
    reqid: get("reqid") ?? get("jsid"),
    title: get("title") ?? job.title ?? "Untitled",
    organization: get("organizations"),
    location: get("city_display") ?? job.addresses?.[0] ?? null,
    department: extractField(description, "Department"),
    payRange: extractField(description, "Pay Rate Range"),
    employmentType: extractField(description, "Full Time or Part Time\\?"),
    openDate: extractField(description, "Open Date"),
    closeDate: extractField(description, "Close Date"),
    applyUrl: job.applicationInfo?.uris?.[0] ?? null,
    description,
    descriptionHash: hashDescription(description),
  };
}

export async function loadStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

export async function saveStore(store) {
  await mkdir(dirname(fileURLToPath(STORE_PATH)), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2) + "\n", "utf8");
}

/**
 * Merges freshly-fetched candidate jobs into the persistent store.
 * - New reqid -> inserted with first_seen_at = now.
 * - Existing reqid -> fields refreshed, last_seen_at bumped, status reopened
 *   if it had lapsed, updated_at stamped if the description changed.
 * - Previously "open" reqid missing from this run -> marked "closed".
 *
 * Returns the updated store plus a summary of what changed.
 */
export function mergeJobs(store, candidates) {
  const now = new Date().toISOString();
  const seenReqids = new Set();
  let added = 0;
  let updated = 0;
  let reopened = 0;

  for (const candidate of candidates) {
    if (!candidate.reqid) continue;
    seenReqids.add(candidate.reqid);

    const existing = store[candidate.reqid];

    if (!existing) {
      store[candidate.reqid] = {
        ...candidate,
        status: "open",
        firstSeenAt: now,
        lastSeenAt: now,
        updatedAt: null,
        closedAt: null,
      };
      added += 1;
      continue;
    }

    const descriptionChanged = existing.descriptionHash !== candidate.descriptionHash;
    const wasClosed = existing.status === "closed";

    store[candidate.reqid] = {
      ...existing,
      ...candidate,
      status: "open",
      lastSeenAt: now,
      updatedAt: descriptionChanged ? now : existing.updatedAt,
      closedAt: wasClosed ? null : existing.closedAt,
    };

    if (descriptionChanged) updated += 1;
    if (wasClosed) reopened += 1;
  }

  let closed = 0;
  for (const [reqid, record] of Object.entries(store)) {
    if (record.status === "open" && !seenReqids.has(reqid)) {
      record.status = "closed";
      record.closedAt = now;
      closed += 1;
    }
  }

  return { store, summary: { added, updated, reopened, closed } };
}
