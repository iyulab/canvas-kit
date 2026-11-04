# Changelog — @canvas-kit/viewer

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package follows
[Semantic Versioning](https://semver.org/) — below 1.0, a minor release may contain breaking changes.

## [Unreleased]

### Fixed

- The edge of a point drawn by `summarizeOverlays` (dashed, dotted or double) is sized in screen pixels and sits clear of the point, with a line no thinner than 1.75 px. At a point of 6 or 7 px — a far view of a crowd — the ring hugged the point as a hairline and a dashed and a dotted edge looked the same; the three forms now read as three. A halo is drawn outside the edge, not over it.

## [0.9.0] - 2026-11-04

### Added

- `summarizeOverlays`: draws the items that have a `summary` (`{ shape: 'dot' | 'ring' | 'pin', color, halo?, edge?: { dash: 'dashed' | 'dotted' | 'double', color } }` — `edge` is a dashed, dotted or double ring close around the point, a second channel apart from its color and halo) as points
  on a canvas instead of as page content once there are more than `above` of them in the view (default 500) — a page of
  thousands of boxes pans and zooms slowly however light each one is, and a canvas of thousands of points does not. It
  turns off again below 0.8 × `above`, so a view at the edge does not flicker. While items are points they take no
  pointer, focus or tooltip and a screen reader does not meet them (one status line, `summaryLabel`, says so); zoom in
  until the count falls and they are page content again. An item without a `summary`, one with `cull: false`, and the
  item that holds the focus are never summarized. Off by default.

## [0.8.0] - 2026-11-03

### Added

- `cullOverlays`: leaves out the overlay items that are well outside the view, so a scene with thousands of them stays
  smooth to update — only the items in view and a margin around it (`{ margin }`, a fraction of the viewport, default
  0.5) are rendered, and the rest are built again as the view nears them. Off by default: with it on, an item outside the
  view is not in the page for a screen reader or the Tab key until the view reaches it. The item that holds the focus is
  always kept, and an item can opt out with `cull: false` (for content that must not be torn down and built again, like a
  frame that holds state). Measured on a scene of 3000 items, zoomed in and updating every two seconds: the main thread
  spends about a third of what it does with every item rendered.

### Changed

- Overlay items are memoized: a pan or zoom, which re-renders the viewer for its new transform, no longer rebuilds the box
  of every item when the `overlays` it was given are the same.

## [0.7.0] - 2026-11-01

### Added

- A tap can be made from the keyboard. With the viewer focused and an `onTap` set, Enter or Space taps the point at the
  middle of the viewport — `pointerType: "keyboard"`, `client` the middle of the viewer — and the arrow keys and `+` / `-`
  already bring the scene under that point. Shift is carried as on a click, and Ctrl or ⌘ with Enter; a held key taps once.
  While the keyboard is in use a small aim mark is drawn at that point (`--ck-viewer-aim` for its ink,
  `--ck-viewer-aim-halo` for the light edge that keeps it readable on any scene). `aria-keyshortcuts` lists `Enter` and
  `Space` only when there is an `onTap`.

  An `onTap` that already exists now also receives these keyboard taps; tell them apart by `pointerType`. Without an
  `onTap`, nothing changes and the page keeps Enter and Space.

## [0.6.1] - 2026-10-23

### Fixed

- Dragging to pan selected the text of the overlay items under the pointer. The viewer now sets `user-select: none`
  (an item that should keep its text selectable sets `user-select: text` on itself, or the host passes it in `style`),
  and a selection begun before the drag became a pan is dropped when the pan starts.

## [0.6.0] - 2026-10-20

### Added

- `wheel: "modified"` — the wheel zooms only with Ctrl or ⌘ held (a trackpad pinch is one) and otherwise scrolls the
  page, with a short line saying how to zoom (`wheelHint`). For a viewer in a page that scrolls.

### Fixed

- The wheel zooming the viewer also scrolled the page under it (and Ctrl + wheel zoomed the page): the wheel is now
  listened to without the passive flag, so the default is prevented when the viewer zooms.

## [0.5.4] - 2026-10-17

### Changed

- Needs `@canvas-kit/core` `^0.8.0`, so an app using the viewer with the designer or the core itself has one copy of
  the core.

## [0.5.3] - 2026-10-16

### Changed

- Depends on `@canvas-kit/core` `^0.7.0`, so it draws what core 0.7.0 adds (rounded rects, a dash on any stroke, text
  placed by `verticalAlign` over a padded background). The dependency is published as a range rather than one exact
  version, so a core patch release reaches it without a viewer release.

## [0.5.2] - 2026-10-16

### Changed

- Built on `@canvas-kit/core` 0.6.0 (a colour the canvas cannot read paints nothing; `Line.dash`).

### Fixed

- `aria-keyshortcuts` names the zoom keys as ARIA spells them — `Plus` (a bare `+` separates a modifier
  from its key), and `=`, which zooms in too.

## [0.5.1] - 2026-10-08

### Changed

- Built against `@canvas-kit/core` 0.5.0, which adds `Shape.locked`; the viewer draws a locked shape
  like any other.

## [0.5.0] - 2026-10-07

### Added

- `ViewerOverlayItem.interactive` (default `true`). `false` marks an overlay as display-only — a
  drawing laid under the scene, a label, a watermark: the pointer passes through it, so a press on it
  is the viewer's (a tap reported to `onTap`, the start of a pan) instead of being left to the item.

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
