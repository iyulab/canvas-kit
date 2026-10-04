# Changelog — @canvas-kit/designer

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/) — below 1.0, a minor release may contain breaking changes.

## [Unreleased]

### Added

- The viewer's viewport contract for `KonvaDesigner`: omit `width`/`height` and it follows its
  container; a drag that starts on empty space pans (a drag on a shape still moves it); the wheel
  zooms around the pointer without scrolling the page; `transform`/`onTransformChange` make the view
  controllable; `onViewportResize` reports the measured size; and `fitToRect(rect, { padding,
  maxScale })` is available through a `DesignerHandle` ref, held until the container is measured.
  Drags and resizes keep reporting scene coordinates. `KonvaDesignerProps`, `DesignerHandle` and
  `FitToRectOptions` are exported.
- Path objects are rendered. Their outline comes from `@canvas-kit/core`'s `tracePath`, the same
  function the canvas renderer uses, so smoothed and closed paths look the same in the designer and
  the viewer.

### Changed — breaking

- Text with `align: 'center'` or `'right'` is anchored at `x` (its middle or right edge), as the
  canvas renderer draws it; it used to be left-aligned at `x` regardless of `align`.
- `FreeDrawingCanvas` no longer takes the `width`/`height` props it ignored.
- The unused dependency on `@canvas-kit/viewer` is removed.

### Fixed

- `AdvancedDesigner` passed its stage to the drawing layer before the stage had mounted, so drawing
  did not work right after choosing the draw tool.
- Callback and transform refs are updated in a layout effect rather than during render.
- The background layer of `AdvancedDesigner` draws lines at their `x`/`y`.
- Type declarations resolve for ESM consumers using `moduleResolution: node16` / `nodenext`.
  `package.json` is exported as `@canvas-kit/designer/package.json`.
