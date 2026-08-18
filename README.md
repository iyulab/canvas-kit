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
import { KonvaDesigner } from '@canvas-kit/designer';

<KonvaDesigner width={800} height={600} />
```

### Viewer (Display Only)

```bash
npm install @canvas-kit/viewer
```

```tsx
import { Viewer } from '@canvas-kit/viewer';

<Viewer width={800} height={600} scene={scene} />
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
```

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