#!/usr/bin/env node
// check-dependency-drift.mjs
// Detects dependency drift: an installed version sitting behind what is already published.
//
// `pnpm install --frozen-lockfile` reinstalls exactly what the lockfile says, so versions that
// a declared range already accepts are never picked up unless someone runs `pnpm update`, and
// new majors go unnoticed entirely. This check makes both visible.
//
// Rules, per dependency reported by `pnpm outdated -r` (workspace packages are not reported):
// - Within the declared range: a gap of two or more minors fails; a patch or single-minor gap is
//   reported only, so routine upstream churn does not turn CI red.
// - Outside the declared range: a new major is a deliberate adoption decision, so it fails
//   unless `dependency-deferrals.json` records why it is deferred and until when. An expired
//   deferral fails, and so does one that no longer matches anything (a stale entry would
//   silently excuse the next major of the same number). A gap of five or more minors within the
//   same major fails regardless.
//
// Usage:
//   node scripts/check-dependency-drift.mjs            # report only, exit 0
//   node scripts/check-dependency-drift.mjs --strict   # exit 1 on any failure above (used in CI)

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const MINOR_GAP_THRESHOLD = 5;
export const IN_RANGE_MINOR_GAP = 2;

export function parseVersion(v) {
  const [major, minor] = v.split('.').map(n => parseInt(n, 10));
  return { major, minor };
}

// Minors from one version to another of the same major; Infinity across majors.
export function minorGap(from, to) {
  const a = parseVersion(from);
  const b = parseVersion(to);
  return a.major === b.major ? b.minor - a.minor : Infinity;
}

export function findDeferral(deferrals, name, latest) {
  const { major } = parseVersion(latest);
  return deferrals.find(d => d.package === name && d.major === major);
}

// Classifies one outdated entry. Pure — the ledger and `today` (YYYY-MM-DD) are passed in, so
// the rules are testable without the registry or the clock.
// Verdicts: 'clean' | 'info' (reported only) | 'deferred' | 'drift' (fails under --strict).
export function classify({ name, current, wanted, latest }, { deferrals = [], today = '' } = {}) {
  if (current !== wanted) {
    if (minorGap(current, wanted) >= IN_RANGE_MINOR_GAP) {
      return { verdict: 'drift', reason: `in-range gap of ${IN_RANGE_MINOR_GAP}+ minors — run \`pnpm update -r\`` };
    }
    return { verdict: 'info', reason: 'small in-range gap' };
  }
  if (current === latest) return { verdict: 'clean', reason: null };
  if (parseVersion(latest).major !== parseVersion(current).major) {
    const deferral = findDeferral(deferrals, name, latest);
    if (!deferral) {
      return { verdict: 'drift', reason: `new major ${latest} — adopt it, or record why not in dependency-deferrals.json` };
    }
    if (deferral.reviewBy < today) {
      return { verdict: 'drift', reason: `deferral expired on ${deferral.reviewBy} — adopt ${latest} or renew it with a current reason` };
    }
    return { verdict: 'deferred', reason: `until ${deferral.reviewBy}: ${deferral.reason}` };
  }
  if (minorGap(current, latest) >= MINOR_GAP_THRESHOLD) {
    return { verdict: 'drift', reason: `${MINOR_GAP_THRESHOLD}+ minors behind the newest release (outside the declared range)` };
  }
  return { verdict: 'info', reason: 'newer release outside the declared range, within tolerance' };
}

// Ledger entries that excuse nothing currently outdated.
export function staleDeferrals(deferrals, entries) {
  return deferrals.filter(d => !entries.some(e =>
    e.name === d.package && e.current === e.wanted
    && parseVersion(e.latest).major === d.major && parseVersion(e.current).major !== d.major));
}

export function readDeferrals(file = fileURLToPath(new URL('../dependency-deferrals.json', import.meta.url))) {
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf8')).deferrals ?? [];
}

// `pnpm outdated --format json` keys entries by package name; one entry covers every workspace
// package that depends on it.
export function toEntries(outdated) {
  return Object.entries(outdated).map(([name, e]) => ({
    name,
    current: e.current,
    wanted: e.wanted,
    latest: e.latest,
    dependents: (e.dependentPackages ?? []).map(p => p.name).join(', '),
  }));
}

function readOutdated() {
  try {
    // `pnpm outdated` exits 1 whenever anything is outdated — that is normal, not a failure of
    // this script. `execSync` with a fixed literal command (never user input): on Windows `pnpm`
    // is a `.cmd` shim that `execFileSync` cannot spawn without a shell.
    const out = execSync('pnpm outdated -r --format json', { encoding: 'utf8' });
    return JSON.parse(out || '{}');
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout || '{}');
    throw err;
  }
}

function main() {
  const strict = process.argv.includes('--strict');
  const today = new Date().toISOString().slice(0, 10);
  const deferrals = readDeferrals();
  const entries = toEntries(readOutdated());

  const found = { info: [], deferred: [], drift: [] };
  for (const e of entries) {
    const { verdict, reason } = classify(e, { deferrals, today });
    if (verdict !== 'clean') found[verdict].push({ ...e, reason });
  }
  const stale = staleDeferrals(deferrals, entries);

  const line = e => `  ${e.name} (${e.dependents}): ${e.current} → ${e.current !== e.wanted ? e.wanted : e.latest} — ${e.reason}`;
  if (found.info.length > 0) {
    console.log('Behind, within tolerance (not a failure):');
    found.info.forEach(e => console.log(line(e)));
  }
  if (found.deferred.length > 0) {
    console.log('\nDeferred majors (dependency-deferrals.json):');
    found.deferred.forEach(e => console.log(line(e)));
  }
  if (stale.length > 0) {
    console.log('\nSTALE DEFERRALS — these entries match nothing outdated; remove them:');
    stale.forEach(d => console.log(`  ${d.package}@${d.major}`));
  }
  if (found.drift.length > 0) {
    console.log('\nDEPENDENCY DRIFT:');
    found.drift.forEach(e => console.log(line(e)));
  }
  if (found.drift.length === 0 && stale.length === 0) {
    console.log('\nNo dependency drift beyond tolerance.');
  } else if (strict) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
