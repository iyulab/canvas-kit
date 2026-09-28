import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minorGap, classify, staleDeferrals, readDeferrals, toEntries } from './check-dependency-drift.mjs';

const today = '2026-10-01';

test('minorGap counts minors within a major and is infinite across majors', () => {
  assert.equal(minorGap('0.16.2', '0.21.0'), 5);
  assert.equal(minorGap('1.2.0', '2.0.0'), Infinity);
});

test('a patch or single-minor in-range gap is reported only; two minors is drift', () => {
  assert.equal(classify({ name: 'vite', current: '8.0.1', wanted: '8.0.4', latest: '8.0.4' }, { today }).verdict, 'info');
  assert.equal(classify({ name: 'vite', current: '8.0.1', wanted: '8.1.0', latest: '8.1.0' }, { today }).verdict, 'info');
  assert.equal(classify({ name: 'vite', current: '8.0.1', wanted: '8.2.0', latest: '8.2.0' }, { today }).verdict, 'drift');
});

test('up to date is clean', () => {
  assert.equal(classify({ name: 'vite', current: '8.2.0', wanted: '8.2.0', latest: '8.2.0' }, { today }).verdict, 'clean');
});

test('a new major without a deferral is drift, with a live one deferred, after its date drift', () => {
  const entry = { name: 'vitest', current: '4.1.11', wanted: '4.1.11', latest: '5.0.2' };
  assert.equal(classify(entry, { today }).verdict, 'drift');
  const deferrals = [{ package: 'vitest', major: 5, reason: 'waiting on x', reviewBy: today }];
  assert.equal(classify(entry, { deferrals, today }).verdict, 'deferred');
  assert.match(classify(entry, { deferrals, today: '2026-10-02' }).reason, /expired/);
});

test('a deferral for one major does not excuse the next', () => {
  const deferrals = [{ package: 'vitest', major: 5, reason: 'x', reviewBy: '2027-01-01' }];
  assert.equal(classify({ name: 'vitest', current: '4.1.11', wanted: '4.1.11', latest: '6.0.0' }, { deferrals, today }).verdict, 'drift');
});

test('same major, five or more minors past the declared range is drift; fewer is reported', () => {
  assert.equal(classify({ name: 'x', current: '0.16.2', wanted: '0.16.2', latest: '0.21.0' }, { today }).verdict, 'drift');
  assert.equal(classify({ name: 'x', current: '0.16.2', wanted: '0.16.2', latest: '0.20.9' }, { today }).verdict, 'info');
});

test('staleDeferrals flags entries that match nothing outdated', () => {
  const deferrals = [
    { package: 'vitest', major: 5, reason: 'x', reviewBy: '2027-01-01' },
    { package: 'typescript', major: 7, reason: 'x', reviewBy: '2027-01-01' },
  ];
  const entries = [{ name: 'vitest', current: '4.1.11', wanted: '4.1.11', latest: '5.0.2' }];
  assert.deepEqual(staleDeferrals(deferrals, entries).map(d => d.package), ['typescript']);
});

test('toEntries reads the pnpm outdated JSON shape', () => {
  const entries = toEntries({
    vitest: { current: '4.1.11', wanted: '4.1.11', latest: '5.0.2', dependentPackages: [{ name: '@canvas-kit/core', location: 'x' }] },
  });
  assert.deepEqual(entries, [{ name: 'vitest', current: '4.1.11', wanted: '4.1.11', latest: '5.0.2', dependents: '@canvas-kit/core' }]);
});

test("the repository's deferral ledger is well-formed", () => {
  for (const d of readDeferrals()) {
    assert.equal(typeof d.package, 'string');
    assert.ok(Number.isInteger(d.major), `${d.package}: major must be an integer`);
    assert.ok(typeof d.reason === 'string' && d.reason.length > 0, `${d.package}: reason required`);
    assert.match(d.reviewBy, /^\d{4}-\d{2}-\d{2}$/, `${d.package}: reviewBy must be YYYY-MM-DD`);
  }
});
