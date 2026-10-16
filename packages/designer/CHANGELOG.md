# Changelog — @canvas-kit/designer

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/) — below 1.0, a minor release may contain breaking changes.

## [Unreleased]

## [0.9.0] - 2026-10-16

### Added

- A `fixed` shape (`@canvas-kit/core` `Shape.fixed`) is selected — a click, Tab, a marquee — but never dragged,
  nudged by the arrows or given transform handles.
- A selected line is drawn in the selection colour, as a selected rect, circle, path or text is.
- `DesignerHandle.select(ids)` — selects shapes as a click or a marquee would, reported through `onSelectionChange`:
  a shape the host just added can be selected at once, so its properties open.
- Draws `Rect.cornerRadius`, a `dash` on any stroked shape, and `Text.verticalAlign`, `background` and `padding` as
  the canvas renderer does. A text with a background is one node — pressing the text inside it selects it.

### Changed

- A line is hit by a press within `POLYLINE_HIT_TOLERANCE` of its stroke, as `containsPoint` judges, not only by one
  on its stroke — a thin line could hardly be clicked.

- Its `@canvas-kit/core` dependency is published as a range (`^0.6.0`) rather than one exact version, so a core
  patch release reaches it without a designer release.

## [0.8.0] - 2026-10-16

### Added

- A line's `dash` (`@canvas-kit/core` `Line.dash`) is drawn.

### Fixed

- `aria-keyshortcuts` names the zoom keys as ARIA spells them — `Plus` (a bare `+` separates a modifier
  from its key), and `=`, which zooms in too.

## [0.7.0] - 2026-10-09

### Added

- `KonvaDesigner` `overlays` (`DesignerOverlayItem[]`): DOM content in scene coordinates over the shapes, panned
  and zoomed with them — the viewer's overlay contract, so an editor can show what a shape stands for (a widget,
  a label) where it is edited. An item is display-only by default (`interactive: false`): the pointer passes
  through to the shape beneath, which is selected, dragged and resized as usual; `interactive: true` gives the item
  its presses, and keys typed into it stay with it.

### Changed

- **Breaking:** `KonvaDesigner`'s focusable surface has the ARIA role `application` instead of
  `region`. It has its own keyboard model (arrows, Tab through the shapes, Space to pan), and in an
  `application` a screen reader passes those keys to it rather than using them to read the page.
  Code that finds the designer by role — `getByRole('region', { name })` in a test — looks for
  `application`.

### Fixed

- `AdvancedDesigner`'s brush colour buttons have an accessible name and report which colour is
  chosen (`aria-pressed`).

## [0.6.0] - 2026-10-08

### Added

- `KonvaDesigner` honours `Shape.locked`: a locked shape takes no pointer events and cannot be
  dragged — a press on it is a press on empty space (a box selection, or clearing the selection) —
  and box selection, Tab, the arrow keys and the transformer leave it out; a selected shape that a new
  scene locks leaves the selection.

## [0.5.0] - 2026-10-05

### Added

- The viewer's viewport contract for `KonvaDesigner`: omit `width`/`height` and it follows its
  container; Space + drag or the middle mouse button pans; the wheel zooms around the pointer without
  scrolling the page; `transform`/`onTransformChange` make the view
  controllable; `onViewportResize` reports the measured size; and `fitToRect(rect, { padding,
  maxScale })` is available through a `DesignerHandle` ref, held until the container is measured.
  Drags and resizes keep reporting scene coordinates. `KonvaDesignerProps`, `DesignerHandle` and
  `FitToRectOptions` are exported.
- Box selection: dragging across empty space selects every shape the box touches (Shift, Ctrl or
  Cmd adds to the selection); a click on empty space clears it. Pressing a shape that is already
  selected keeps the selection, so the whole group can be dragged, as one undo step.
- Keyboard operation: the designer is a focusable, named region (`ariaLabel`, default "Designer").
  Arrow keys move the selection one unit (Shift: ten) as one undo step, or pan when nothing is
  selected; `+`/`-` zoom around the middle; Tab and Shift+Tab select the next or previous shape,
  leaving the designer past either end; Escape clears the selection. Keys pressed with Ctrl, Cmd or
  Alt are left to the host.
- Path objects are rendered. Their outline comes from `@canvas-kit/core`'s `tracePath`, the same
  function the canvas renderer uses, so smoothed and closed paths look the same in the designer and
  the viewer.

### Changed — breaking

- Multi-selection is always on, and the `enableMultiSelect` prop is removed: Shift, Ctrl or Cmd +
  click adds or removes a shape (it used to take Ctrl only, and only with `enableMultiSelect`).
- Text with `align: 'center'` or `'right'` is anchored at `x` (its middle or right edge), as the
  canvas renderer draws it; it used to be left-aligned at `x` regardless of `align`.
- `FreeDrawingCanvas` no longer takes the `width`/`height` props it ignored.
- The unused dependency on `@canvas-kit/viewer` is removed.

### Fixed

- `AdvancedDesigner` passed its stage to the drawing layer before the stage had mounted, so drawing
  did not work right after choosing the draw tool.
- Callback and transform refs are updated in a layout effect rather than during render.
- The background layer of `AdvancedDesigner` draws lines at their `x`/`y`.
- Dragging several selected shapes recorded one undo step per shape.
- Type declarations resolve for ESM consumers using `moduleResolution: node16` / `nodenext`.
  `package.json` is exported as `@canvas-kit/designer/package.json`.
