# Changelog — @canvas-kit/core

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/) — below 1.0, a minor release may contain breaking changes.

## [Unreleased]

## [0.4.0] - 2026-10-05

### Changed — breaking

Object geometry now has one definition, used by `CanvasKitRenderer`, the designer, `HitTest`,
`SelectionManager` and `SelectionUtils`. They used to disagree, so the same scene rendered and hit
differently depending on where it was drawn.

- **Text `y` is the top of the text box.** `CanvasKitRenderer` and `HitTest` treated it as the
  alphabetic baseline, so text drawn by the renderer moves down by one line. To keep text where it
  was, subtract its `fontSize` (default 16) from `y`.
- **Line and path `points` are relative to the object's `x`/`y`.** The renderer ignored `x`/`y` for
  these types. Scenes that keep `x: 0, y: 0` on lines and paths are unaffected; otherwise subtract
  `x`/`y` from the points to keep them in place.
- **Text without `fill` is drawn black, and a line without `stroke`/`strokeWidth` is drawn black and
  1px wide.** The renderer skipped both, so they were invisible.
- **Text `x` follows `align`** in bounds and hit testing: it is the left edge, the middle or the right
  edge of the text box, as the renderer already drew it.
- `SelectionManager.getObjectBounds` and the `SelectionUtils` predicates return the same boxes as
  `HitTest`. Line and path bounds cover their points (they used to be an empty box at `x`/`y`).
- `ResizeCommand` takes `ResizeGeometry` objects instead of `any`.

### Added

- Geometry helpers: `getObjectBounds`, `containsPoint`, `isObjectInsideRect`,
  `isObjectIntersectingRect`, `measureTextWidth`, `textBoxOffsetX`, `polylinePoints` and the
  `BoundingBox` type.
- `tracePath` (and its `PathContext` type), which builds a path outline on any 2D context, so a
  custom renderer draws paths exactly as the built-in ones do.
- Rendering defaults as constants: `DEFAULT_FONT_SIZE`, `DEFAULT_FONT_FAMILY`, `DEFAULT_TEXT_FILL`,
  `DEFAULT_LINE_STROKE`, `DEFAULT_LINE_WIDTH`.
- `zoomAt(transform, point, factor, bounds)` — zoom by a factor around a view point, with the scale
  clamped.
- `ResizeGeometry` type.
- `CompositeCommand` applies, undoes and redoes several commands as one step.

### Fixed

- Type declarations resolve for ESM consumers using `moduleResolution: node16` / `nodenext`: the
  `import` condition now points at `index.d.mts` instead of a CommonJS declaration file.
  `package.json` is exported as `@canvas-kit/core/package.json`.
