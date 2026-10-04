# Canvas-Kit Architecture

## Overview

Canvas-Kit은 3개의 npm 패키지로 구성되며, UI 종속성에 따라 명확히 분리됩니다. `core`는 UI에
독립적인 순수 TypeScript 데이터 엔진이고, `designer`/`viewer`는 그 위에 얹힌 React 컴포넌트입니다
(아래 Tech Stack 참고).

## Tech Stack

| 역할 | 기술 |
|------|------|
| 모노레포 | pnpm workspaces |
| 빌드 | tsup (ESM/CJS 듀얼 빌드) |
| 타입 | TypeScript 6 (strict) |
| 렌더링 | Native Canvas 2D (core), Konva.js 10 (designer) |
| 프레임워크 | React 19 (designer, viewer) |
| 테스트 | Vitest 5 |
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
| `HitTest` | 좌표 기반 객체 감지 — `geometry.ts`에 위임 |
| `SelectionManager` | 선택 상태 관리, 이벤트 에미터 |
| `SelectionUtils` | 영역 선택 — 판정은 `geometry.ts`에 위임 |
| `geometry.ts` | 객체 기하의 단일 정의 — `getObjectBounds`·`containsPoint`·`isObjectInsideRect`·`isObjectIntersectingRect`, 렌더 기본값 상수 |
| `CommandHistory` | Undo/Redo 스택 + 이벤트 에미터 |
| `Clipboard` | 싱글톤 클립보드, 깊은 복사 |

### 타입 시스템

```
DrawingObject = Rect | Circle | Text | Path | Line
```

모든 타입은 `packages/core/src/types.ts`에 정의. `id?`, `x`, `y`, `fill?`, `stroke?`, `strokeWidth?`를 공유 속성으로 가짐.

**좌표 의미는 렌더러마다 같다**(`CanvasKitRenderer`의 Canvas 2D와 designer의 Konva): `rect`/`image`는 `x`/`y`가 좌상단, `circle`은 중심,
`text`는 `y`가 텍스트 상자 상단(높이 = `fontSize` 한 줄)이고 `x`는 `align`에 따라 상자의 왼쪽·가운데·오른쪽, `line`/`path`의 `points`는 `x`/`y` 기준 상대좌표(이동 = `x`/`y` 변경).
`path` 윤곽은 `tracePath` 하나로 그린다(designer는 Konva `Shape`의 `sceneFunc`에서 같은 함수를 호출). 채우기·선 기본값
(`DEFAULT_TEXT_FILL`·`DEFAULT_LINE_STROKE`·`DEFAULT_LINE_WIDTH`)도 한 곳에서 정의해 두 렌더러가 같은 문서를 같게 그린다. 바운딩 박스·hit test·영역 선택은
전부 `geometry.ts` 하나를 쓴다.

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
| `KonvaDesigner` | Konva Stage 기반 편집기 (선택, 이동, 리사이즈, 회전) + 뷰포트(아래) |
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

## 뷰포트 계약 (viewer · designer 공통)

두 컴포넌트는 같은 뷰포트 언어를 쓴다. 좌표 수식(`viewToScene`/`sceneToView`/`fitTransform`/`zoomAt`)은 core `transform.ts` 한 곳.

| 항목 | 동작 |
|------|------|
| 크기 | `width`/`height` 생략 시 부모를 채우고 리사이즈를 따름(transform 유지). `onViewportResize`가 크기를 보고 |
| transform | `transform` + `onTransformChange`면 controlled(스스로 바꾸지 않고 다음 값만 보고), 생략하면 내부 소유(identity 시작) |
| 팬/줌 | 드래그 팬(designer는 빈 영역에서 시작한 드래그만 — 도형 위 드래그는 도형 이동), 휠은 포인터 기준 줌(`minScale`/`maxScale`) |
| fit | handle `fitToRect(rect, { padding, maxScale })` — 측정 전 요청은 보류했다가 크기가 생기면 1회 적용 |
| 키보드 | viewer: 포커스 가능(`ariaLabel`), 화살표 팬·`+`/`-` 줌. designer: 미정(화살표의 도형 이동 관례와 충돌) |

designer는 transform을 Konva Stage에 적용하므로 드래그·리사이즈가 보고하는 위치·크기는 언제나 장면 좌표다.

## Project Structure

```
packages/
├── core/src/
│   ├── types.ts        — DrawingObject 타입 정의
│   ├── scene.ts        — Scene 클래스
│   ├── renderer.ts     — CanvasKitRenderer
│   ├── geometry.ts     — 객체 기하(박스·포함·영역 판정)와 렌더 기본값
│   ├── trace-path.ts   — path 윤곽 그리기(모든 렌더러 공용)
│   ├── hit-test.ts     — HitTest
│   ├── selection.ts    — SelectionManager, SelectionUtils
│   ├── transform.ts    — viewToScene/sceneToView, fitTransform, zoomAt (뷰 transform 좌표 계산)
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
pnpm -w run test:packages   # core + viewer + designer
pnpm --filter @canvas-kit/core test:watch
```

테스트 파일은 `src/*.test.ts(x)` 규칙을 따르며 Vitest 5 문법을 사용.

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
