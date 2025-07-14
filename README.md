# Canvas-Kit

프레임워크 중립적인 웹 컴포넌트 기반 캔버스 라이브러리로 필수적인 편집 기능을 제공합니다.

## ✨ Features

- 🎨 **Essential Elements** - Rectangle, Circle, Text, Image, Drawing
- 🔄 **History Management** - Undo/Redo system (Designer only)
- 🎯 **Multi-Selection** - Select and manipulate multiple elements
- 🖱️ **Interactive Controls** - Drag, resize, rotate with visual handles
- 📱 **Touch Support** - Mobile and tablet optimized
- 🌐 **Framework Agnostic** - Works with any framework or vanilla JS
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

```html
<canvas-designer width="800" height="600"></canvas-designer>
```

### Viewer (Display Only)

```bash
npm install @canvas-kit/viewer
```

```html
<canvas-viewer src="./design.json" width="800" height="600"></canvas-viewer>
```

### Core (Data Processing)

```bash
npm install @canvas-kit/core
```

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
- Web Components for maximum compatibility
- TypeScript for development safety
- Event-driven architecture for clean communication

## 🌐 Framework Integration

Works seamlessly with any framework:

```html
<!-- Vanilla JS -->
<canvas-designer></canvas-designer>

<!-- React -->
<canvas-designer ref={canvasRef} />

<!-- Vue -->
<canvas-designer ref="canvas" />

<!-- Angular -->
<canvas-designer #canvas></canvas-designer>
```

## 📖 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - System design and principles
- [API Reference](docs/API.md) - Complete API documentation
- [Examples](examples/) - Usage examples and demos

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build packages
npm run build
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