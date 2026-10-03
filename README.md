# Canvas-Kit

React 기반 캔버스 라이브러리로 필수적인 편집 기능을 제공합니다. `@canvas-kit/core`는 UI에
독립적인 순수 TypeScript 데이터 엔진이고, `@canvas-kit/designer`·`@canvas-kit/viewer`는 그
위에 얹힌 React 컴포넌트입니다.

[![Deploy Canvas-Kit Site to Pages](https://github.com/iyulab/canvas-kit/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/iyulab/canvas-kit/actions/workflows/deploy-pages.yml)

## 🌐 Live Demo

Canvas-Kit의 모든 기능을 확인해보세요: **[https://iyulab.github.io/canvas-kit](https://iyulab.github.io/canvas-kit)**

## ✨ Features

- 🎨 **Essential Elements** - Rectangle, Circle, Text, Image, Drawing
- 🔄 **History Management** - Undo/Redo system (Designer only)
- 🎯 **Multi-Selection** - Select and manipulate multiple elements
- 🖱️ **Interactive Controls** - Drag, resize, rotate with visual handles
- 📱 **Touch Support** - Mobile and tablet optimized
- ⚛️ **React Components** - `designer`/`viewer` are React components; `core` has zero UI
  dependencies and runs standalone (Node.js or any renderer you build on top of it)
- 🔧 **TypeScript Ready** - Full type safety
- ⚡ **High Performance** - Powered by Konva.js and HTML rendering

## 📦 Packages

| Package | Purpose | Bundle Size | Use Cases |
|---------|---------|-------------|-----------|
| **@canvas-kit/core** | Data processing engine | ~50KB | Server-side, data conversion, custom renderers |
| **@canvas-kit/designer** | Complete editor UI | ~200KB | Design tools, graphic editors |
| **@canvas-kit/viewer** | Lightweight HTML viewer | ~80KB | Website embeds, mobile viewers |

## 🚀 Quick Start

### Designer (Complete Editor)

```bash
npm install @canvas-kit/designer
```

```tsx
import { useState } from 'react';
import { KonvaDesigner } from '@canvas-kit/designer';
import { Scene } from '@canvas-kit/core';

function App() {
  const [scene, setScene] = useState(new Scene());
  return <KonvaDesigner width={800} height={600} scene={scene} onSceneChange={setScene} />;
}
```

### Viewer (Display Only)

```bash
npm install @canvas-kit/viewer
```

```tsx
import { Viewer } from '@canvas-kit/viewer';

// `scene` is a `Scene` instance (see Core below), not a plain array of objects
<Viewer width={800} height={600} scene={scene} />
```

- **Sizing** — omit `width`/`height` and the viewer fills its parent, following resizes (the
  pan/zoom transform is kept). The canvas is rendered at `devicePixelRatio` for sharp output.
- **Pan/zoom** — wheel zooms around the pointer, drag pans. Pass `transform` +
  `onTransformChange` to control it; `minScale`/`maxScale` bound the zoom.
- **Taps** — `onTap` fires for a press and release that stays within `tapThreshold` (default
  4px), with the point in scene coordinates. Presses on overlay items are left to the items.
- **Fit to a region** — `ref.current.fitToRect(rect, { padding, maxScale })` through a
  `ViewerHandle` ref (`maxScale: 1` shrinks to fit without magnifying), or compute it yourself
  with the pure `fitTransform(viewport, rect, options)`. A fit asked for before a container-sized
  viewer has been measured (e.g. from a mount effect) is applied once it has a size.
  `viewToScene`/`sceneToView` convert points under a transform.
- **Theming** — the border and background read `--ck-viewer-border` (default
  `1px solid #ccc`) and `--ck-viewer-background` (default `transparent`); `className`/`style`
  go to the container.

```tsx
const viewer = useRef<ViewerHandle>(null);

<div style={{ height: '100%', '--ck-viewer-border': 'none' } as React.CSSProperties}>
  <Viewer
    ref={viewer}
    scene={scene}
    onTap={({ scene: point }) => select(scene.getObjectAtPoint(point.x, point.y))}
  />
</div>;

viewer.current?.fitToRect({ x: 0, y: 0, width: 1200, height: 800 }, { padding: 24 });
```

### Core (Data Processing)

```bash
npm install @canvas-kit/core
```

`core` has no UI — it exposes the `Scene`/`CanvasKitRenderer` data model that `designer` and
`viewer` build on. Use it directly for server-side processing or a custom renderer.

## 🎨 What You Can Build

- **Design Tools** - Online graphics editors and creative apps
- **Diagramming** - Flowcharts, wireframes, technical diagrams
- **Educational Apps** - Interactive learning tools
- **Content Creation** - Social media graphics, marketing materials
- **Prototyping** - Quick mockups and design validation
- **Presentations** - Interactive slide content

## 🏗️ Architecture

**3-Package System:**
- **Core** - UI-independent data engine
- **Designer** - Full editing environment with Konva.js
- **Viewer** - Lightweight HTML renderer

**Built on Modern Standards:**
- React components (`designer`/`viewer`) for a familiar integration surface
- TypeScript for development safety
- Event-driven architecture for clean communication

## ⚛️ React Integration

`designer` and `viewer` are React components — `react`/`react-dom` ^18 or ^19 as peer
dependencies:

```tsx
import { KonvaDesigner } from '@canvas-kit/designer';
import { Viewer } from '@canvas-kit/viewer';
```

Non-React frameworks aren't currently supported — `core` alone (no React dependency) is the
integration point if you need to build a custom renderer for another framework.

## 📖 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design and principles
- [Live Demo](https://iyulab.github.io/canvas-kit) - Interactive samples for every feature

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Start development (demo site)
pnpm dev

# Run tests
pnpm test

# Build packages
pnpm build:all

# Everything CI runs on the code (build, type-check, tests)
pnpm check

# Dependencies behind their published versions
pnpm check:dependency-drift
```

CI also fails when a dependency falls behind: an in-range gap of two or more minors, or a new
major that is neither adopted nor recorded in [`dependency-deferrals.json`](dependency-deferrals.json)
with a reason and a review date (the check fails again once that date passes). It runs on every
push and weekly.

## 📈 Performance

- **Bundle Sizes**: Optimized for tree-shaking
- **Rendering**: Hardware-accelerated canvas and CSS
- **Memory**: Efficient element management
- **Mobile**: Touch-optimized interactions

## 🌟 Design Philosophy

- **Simplicity** - Easy to learn and integrate
- **Performance** - Smooth interactions at scale
- **Flexibility** - Extensible for custom needs
- **Standards** - Built on web standards for longevity