# Canvas-Kit Architecture

## Overview

Canvas-Kit은 프레임워크 중립적인 캔버스 라이브러리입니다. 3개의 npm 패키지로 구성되며, UI 종속성에 따라 명확히 분리됩니다.

## Tech Stack

| 역할 | 기술 |
|------|------|
| 모노레포 | pnpm workspaces |
| 빌드 | tsup (ESM/CJS 듀얼 빌드) |
| 타입 | TypeScript 6 (strict) |
| 렌더링 | Native Canvas 2D (core), Konva.js 10 (designer) |
| 프레임워크 | React 19 (designer, viewer) |
| 테스트 | Vitest 4 |
| 사이트 | Next.js 16 (Turbopack) + Tailwind CSS 4 |

## Package Structure

```
@canvas-kit/core        — UI 독립적 데이터 엔진 (Node.js 실행 가능)
       ↑         ↑
@canvas-kit/viewer   @canvas-kit/designer
```

| Package | 목표 | 핵심 의존성 |
|---------|------|------------|
| **@canvas-kit/core** | 데이터 처리, 렌더링, 히스토리 | 없음 (순수 TS) |
| **@canvas-kit/designer** | 완전한 편집 UI | core, Konva.js, React |
| **@canvas-kit/viewer** | 경량 읽기 전용 렌더러 | core, React |

## Core Package

### 주요 클래스

| 클래스 | 책임 |
|--------|------|
| `Scene` | DrawingObject 컬렉션 관리 (add/remove/getObjects) |
| `CanvasKitRenderer` | Canvas 2D API로 Scene 렌더링 |
| `HitTest` | 좌표 기반 객체 감지 (bounding box) |
| `SelectionManager` | 선택 상태 관리, 이벤트 에미터 |
| `SelectionUtils` | 영역 선택, 바운딩 박스 계산 |
| `CommandHistory` | Undo/Redo 스택 + 이벤트 에미터 |
| `Clipboard` | 싱글톤 클립보드, 깊은 복사 |

### 타입 시스템

```
DrawingObject = Rect | Circle | Text | Path | Line
```

모든 타입은 `packages/core/src/types.ts`에 정의. `id?`, `x`, `y`, `fill?`, `stroke?`, `strokeWidth?`를 공유 속성으로 가짐.

### Command Pattern

```
ICommand { execute(), undo(), getDescription() }
  ├─ MoveCommand
  ├─ ResizeCommand
  ├─ AddCommand
  ├─ DeleteCommand
  └─ (clipboard.ts) CopyCommand, CutCommand, PasteCommand, DuplicateCommand

CommandHistory
  ├─ execute(cmd) → undoStack.push, notify('execute')
  ├─ undo()       → redoStack.push, notify('undo')
  ├─ redo()       → undoStack.push, notify('redo')
  └─ clear()      → notify('clear')
```

CommandHistory는 `addEventListener/removeEventListener`로 상태 변경을 외부에 알립니다.

## Designer Package

### 주요 컴포넌트

| 컴포넌트 | 책임 |
|----------|------|
| `KonvaDesigner` | Konva Stage 기반 편집기 (선택, 이동, 리사이즈, 회전) |
| `AdvancedDesigner` | 멀티 도구 편집기 (select/draw/text/rect/circle) |
| `FreeDrawingCanvas` | Konva 기반 자유 그리기 (브러시/지우개) |
| `EditableText` | 인라인 텍스트 편집 |
| `SimpleSelectionDemo` | 선택 시스템 데모 컴포넌트 |

### AdvancedDesigner 도구 동작

| 도구 | 동작 | 단축키 |
|------|------|--------|
| select | KonvaDesigner 위임 (드래그/리사이즈/회전) | 1 |
| draw | FreeDrawingCanvas (브러시/지우개) | 2 |
| text | 클릭 위치에 EditableText 추가 | 3 |
| rect | 클릭-드래그로 Rect 생성 → AddCommand | 4 |
| circle | 클릭(중심)-드래그로 Circle 생성 → AddCommand | 5 |

## Project Structure

```
packages/
├── core/src/
│   ├── types.ts        — DrawingObject 타입 정의
│   ├── scene.ts        — Scene 클래스
│   ├── renderer.ts     — CanvasKitRenderer
│   ├── hit-test.ts     — HitTest
│   ├── selection.ts    — SelectionManager, SelectionUtils
│   ├── commands.ts     — Command pattern, CommandHistory
│   ├── clipboard.ts    — Clipboard, Copy/Cut/Paste/Duplicate commands
│   └── index.ts        — public exports
├── designer/src/
│   ├── KonvaDesigner.tsx
│   ├── AdvancedDesigner.tsx
│   ├── FreeDrawingCanvas.tsx
│   ├── EditableText.tsx
│   ├── SimpleSelectionDemo.tsx
│   └── index.tsx       — public exports
└── viewer/src/
    ├── viewer.tsx
    └── index.ts

site/
└── src/app/
    ├── page.tsx        — 홈
    └── samples/        — 기능별 데모 페이지
        ├── basic-rendering/
        ├── designer/
        ├── advanced-designer/
        ├── free-drawing/
        ├── hit-test/
        ├── selection/
        ├── undo-redo/
        ├── copy-paste/
        ├── animation/
        └── interactive-map/
```

## Testing

```bash
pnpm -w run test:packages   # core + viewer
pnpm --filter @canvas-kit/core test:watch
```

테스트 파일은 `src/*.test.ts(x)` 규칙을 따르며 Vitest 4 문법을 사용.

## Build

```bash
pnpm build:all   # 모든 패키지 + site
pnpm build       # core만
```

tsup이 ESM (.mjs) + CJS (.js) + 타입 정의 (.d.ts)를 생성. `dist/`를 npm에 배포.

## NPM Publishing

```bash
# GitHub Actions: .github/workflows/publish-npm.yml
# 수동 트리거 (workflow_dispatch)
# NPM_TOKEN secret 필요
```
