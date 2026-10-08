// Every published package's current version has its own section in that package's CHANGELOG.md.
// CI publishes whatever version on main is not yet on npm, so a release commit that bumps a
// version without renaming `## [Unreleased]` would otherwise ship with no release notes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const packagesDir = new URL('../packages/', import.meta.url);

function sectionBody(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith(`## [${version}]`));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .map(dir => ({ dir, manifest: JSON.parse(readFileSync(new URL(`${dir}/package.json`, packagesDir), 'utf8')) }))
  .filter(({ manifest }) => !manifest.private);

test('finds the published packages', () => {
  assert.ok(packages.length > 0);
});

for (const { dir, manifest } of packages) {
  test(`${manifest.name}@${manifest.version} has a section in its CHANGELOG.md`, () => {
    const changelog = readFileSync(new URL(`${dir}/CHANGELOG.md`, packagesDir), 'utf8');
    const body = sectionBody(changelog, manifest.version);
    assert.notEqual(body, null, `packages/${dir}/CHANGELOG.md has no "## [${manifest.version}]" section`);
    assert.ok(body.length > 0, `packages/${dir}/CHANGELOG.md "## [${manifest.version}]" section is empty`);
  });
}

test('reads a section up to the next heading', () => {
  const changelog = '# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2026-01-01\n\n### Added\n\n- A\n\n## [0.1.0] - 2025-12-01\n\n- B\n';
  assert.equal(sectionBody(changelog, '0.2.0'), '### Added\n\n- A');
  assert.equal(sectionBody(changelog, '0.1.0'), '- B');
  assert.equal(sectionBody(changelog, '0.3.0'), null);
  assert.equal(sectionBody('## [0.1.0] - 2025-12-01\n\n## [0.0.9]\n', '0.1.0'), '');
});
