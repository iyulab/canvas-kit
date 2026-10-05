# Changelog — @canvas-kit/viewer

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/) — below 1.0, a minor release may contain breaking changes.

## [Unreleased]

## [0.4.0] - 2026-10-05

### Changed — breaking

- Scenes render with `@canvas-kit/core`'s shared geometry: text `y` is the top of the text box
  (it was the baseline), line and path points are relative to the object's `x`/`y`, and text without
  `fill` or a line without stroke settings is drawn black instead of being skipped. See the
  `@canvas-kit/core` changelog for how to keep existing scenes in place.

### Added

- Keyboard pan and zoom. The viewer is focusable and named (`ariaLabel`, `role="region"`,
  `aria-keyshortcuts`): the arrow keys pan (Shift for a larger step) and `+`/`-` zoom around the
  middle, within `minScale`/`maxScale`, reported through `onTransformChange`. Keys typed inside an
  overlay item are left to the item, and a handled key does not scroll the page.
- `onViewportResize` reports the viewport size once it is known and on every change, so an owner
  that controls `transform` can keep a region fitted as the container resizes.
- `FitToRectOptions.maxScale` caps the fitted scale for one `fitToRect` call, within the viewer's own
  bounds — `maxScale: 1` shrinks a large region to fit without magnifying a small one.

### Fixed

- A `fitToRect` asked for before a container-sized viewer has been measured (for example from a
  mount effect) is held and applied once the viewport has a size, instead of fitting into an empty
  viewport.
- Callback and transform refs are updated in a layout effect rather than during render, so a
  discarded render cannot leave a stale value behind.
- Type declarations resolve for ESM consumers using `moduleResolution: node16` / `nodenext`.
  `package.json` is exported as `@canvas-kit/viewer/package.json`.
