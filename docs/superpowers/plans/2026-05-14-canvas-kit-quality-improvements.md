# Canvas-Kit Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드베이스 조사에서 도출된 Critical 버그 3건, Core 품질 개선 3건, CommandHistory 이벤트 에미터, 테스트 2파일, AdvancedDesigner rect/circle 구현, 문서 정비 3건을 완료한다.

**Architecture:** 그룹 A/B/C/F는 병렬 실행 가능(상호 독립). 그룹 D/E는 그룹 C(CommandHistory 이벤트 에미터) 완료 후 실행. CommandHistoryEvent 패턴은 기존 SelectionManager의 addEventListener/removeEventListener 패턴과 동일하게 구현한다.

**Tech Stack:** TypeScript, Vitest v4, React, Konva.js / react-konva, pnpm workspaces

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Delete | `packages/designer/src/SelectableViewer.tsx` | 제거 (broken, 미사용) |
| Modify | `packages/core/src/renderer.ts` | console.log 제거, text.align 수정 |
| Modify | `packages/core/src/clipboard.ts` | 깊은 복사, CopyCommand.undo(), getClipboardData() |
| Modify | `packages/core/src/hit-test.ts` | Path/Line bounding box hit-test 추가 |
| Modify | `packages/core/src/commands.ts` | CommandHistoryEvent + addEventListener/removeEventListener |
| Modify | `packages/designer/src/AdvancedDesigner.tsx` | 폴링 제거, 이벤트 구독, rect/circle 구현 |
| Create | `packages/core/src/commands.test.ts` | CommandHistory 테스트 |
| Create | `packages/core/src/clipboard.test.ts` | Clipboard 테스트 |
| Modify | `docs/ARCHITECTURE.md` | 전면 재작성 |
| Modify | `docs/TASKS.md` | 대시보드 현행화 |
| Modify | `claudedocs/plans/2026-03-18-npm-publish.md` | 완료 체크박스 처리 |

---

## Task 1: SelectableViewer.tsx 제거

**Files:**
- Delete: `packages/designer/src/SelectableViewer.tsx`

- [ ] **Step 1: 파일 삭제**

```bash
# Windows PowerShell
Remove-Item packages/designer/src/SelectableViewer.tsx
```

- [ ] **Step 2: 빌드로 참조 없음 확인**

Run: `pnpm --filter @canvas-kit/designer build`
Expected: 빌드 성공 (SelectableViewer를 import하는 곳 없음)

- [ ] **Step 3: Commit**

```bash
git add -A packages/designer/src/SelectableViewer.tsx
git commit -m "fix(designer): remove broken SelectableViewer (SVGOverlay undefined)"
```

---

## Task 2: renderer.ts — console.log 제거

**Files:**
- Modify: `packages/core/src/renderer.ts`

- [ ] **Step 1: 모든 console.log/console.warn 제거 (warn은 유지), text.align 적용**

`packages/core/src/renderer.ts` 전체를 다음으로 교체:

```typescript
import type { Scene } from './scene';
import type { Rect, Circle, Text, Path, Line, DrawingObject } from './types';

export class CanvasKitRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }

        this.canvas = canvas;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context. Canvas 2D is not supported.');
        }
        this.ctx = ctx;
    }

    public clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public render(scene: Scene) {
        if (!scene) {
            console.warn('Scene is required for rendering');
            return;
        }

        this.clear();
        const objects = scene.getObjects();

        for (const obj of objects) {
            try {
                this.renderObject(obj);
            } catch (error) {
                console.warn(`Failed to render object of type "${obj.type}":`, error);
            }
        }
    }

    private renderObject(obj: DrawingObject) {
        switch (obj.type) {
            case 'rect':
                this.drawRect(obj as Rect);
                break;
            case 'circle':
                this.drawCircle(obj as Circle);
                break;
            case 'text':
                this.drawText(obj as Text);
                break;
            case 'path':
                this.drawPath(obj as Path);
                break;
            case 'line':
                this.drawLine(obj as Line);
                break;
            default:
                break;
        }
    }

    private drawRect(rect: Rect) {
        if (rect.fill) {
            this.ctx.fillStyle = rect.fill;
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        if (rect.stroke && rect.strokeWidth) {
            this.ctx.strokeStyle = rect.stroke;
            this.ctx.lineWidth = rect.strokeWidth;
            this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    private drawCircle(circle: Circle) {
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);

        if (circle.fill) {
            this.ctx.fillStyle = circle.fill;
            this.ctx.fill();
        }

        if (circle.stroke && circle.strokeWidth) {
            this.ctx.strokeStyle = circle.stroke;
            this.ctx.lineWidth = circle.strokeWidth;
            this.ctx.stroke();
        }
    }

    private drawText(text: Text) {
        const fontSize = text.fontSize || 16;
        const fontFamily = text.fontFamily || 'Arial';
        const align = text.align || 'left';

        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = align;

        if (text.fill) {
            this.ctx.fillStyle = text.fill;
            this.ctx.fillText(text.text, text.x, text.y);
        }

        if (text.stroke && text.strokeWidth) {
            this.ctx.strokeStyle = text.stroke;
            this.ctx.lineWidth = text.strokeWidth;
            this.ctx.strokeText(text.text, text.x, text.y);
        }

        // 기본값으로 복원 (다음 객체에 영향 없도록)
        this.ctx.textAlign = 'left';
    }

    private drawPath(path: Path) {
        if (path.points.length < 4) return;

        this.ctx.beginPath();
        this.ctx.moveTo(path.points[0], path.points[1]);

        if (path.tension && path.tension > 0) {
            for (let i = 2; i < path.points.length - 2; i += 2) {
                const xc = (path.points[i] + path.points[i + 2]) / 2;
                const yc = (path.points[i + 1] + path.points[i + 3]) / 2;
                this.ctx.quadraticCurveTo(path.points[i], path.points[i + 1], xc, yc);
            }
            if (path.points.length >= 4) {
                const lastIndex = path.points.length - 2;
                this.ctx.quadraticCurveTo(
                    path.points[lastIndex - 2],
                    path.points[lastIndex - 1],
                    path.points[lastIndex],
                    path.points[lastIndex + 1]
                );
            }
        } else {
            for (let i = 2; i < path.points.length; i += 2) {
                this.ctx.lineTo(path.points[i], path.points[i + 1]);
            }
        }

        if (path.closed) {
            this.ctx.closePath();
        }

        if (path.fill && path.closed) {
            this.ctx.fillStyle = path.fill;
            this.ctx.fill();
        }

        if (path.stroke && path.strokeWidth) {
            this.ctx.strokeStyle = path.stroke;
            this.ctx.lineWidth = path.strokeWidth;
            this.ctx.stroke();
        }
    }

    private drawLine(line: Line) {
        if (line.points.length < 4) return;

        this.ctx.beginPath();
        this.ctx.moveTo(line.points[0], line.points[1]);

        for (let i = 2; i < line.points.length; i += 2) {
            this.ctx.lineTo(line.points[i], line.points[i + 1]);
        }

        if (line.stroke && line.strokeWidth) {
            this.ctx.strokeStyle = line.stroke;
            this.ctx.lineWidth = line.strokeWidth;
            this.ctx.stroke();
        }
    }
}
```

- [ ] **Step 2: 기존 스냅샷 테스트 업데이트 확인**

Run: `pnpm --filter @canvas-kit/core test`
Expected: 스냅샷이 변경되면 `u` 키로 업데이트. 30개 테스트 통과.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/renderer.ts packages/core/src/__snapshots__
git commit -m "fix(core): remove debug console.log, apply text.align in renderer"
```

---

## Task 3: clipboard.ts — 깊은 복사 + CopyCommand.undo() + getClipboardData()

**Files:**
- Modify: `packages/core/src/clipboard.ts`

- [ ] **Step 1: clipboard.ts 전체를 다음으로 교체**

```typescript
import type { DrawingObject } from './types';
import { Scene } from './scene';
import type { ICommand } from './commands';

export class Clipboard {
    private static instance: Clipboard;
    private clipboardData: DrawingObject[] = [];

    private constructor() { }

    static getInstance(): Clipboard {
        if (!Clipboard.instance) {
            Clipboard.instance = new Clipboard();
        }
        return Clipboard.instance;
    }

    copy(objects: DrawingObject[]): void {
        this.clipboardData = objects.map(obj => structuredClone(obj));
    }

    paste(): DrawingObject[] {
        return this.clipboardData.map(obj => ({
            ...structuredClone(obj),
            id: `${obj.type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            x: obj.x + 20,
            y: obj.y + 20
        }));
    }

    getClipboardData(): DrawingObject[] {
        return this.clipboardData.map(obj => structuredClone(obj));
    }

    isEmpty(): boolean {
        return this.clipboardData.length === 0;
    }

    getCount(): number {
        return this.clipboardData.length;
    }

    clear(): void {
        this.clipboardData = [];
    }
}

export class CopyCommand implements ICommand {
    private objects: DrawingObject[];
    private clipboard: Clipboard;
    private previousClipboardData: DrawingObject[] = [];

    constructor(objects: DrawingObject[]) {
        this.objects = objects;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        this.previousClipboardData = this.clipboard.getClipboardData();
        this.clipboard.copy(this.objects);
    }

    undo(): void {
        this.clipboard.copy(this.previousClipboardData);
    }

    getDescription(): string {
        return `Copy ${this.objects.length} object(s)`;
    }
}

export class CutCommand implements ICommand {
    private objects: DrawingObject[];
    private scene: Scene;
    private clipboard: Clipboard;

    constructor(objects: DrawingObject[], scene: Scene) {
        this.objects = objects;
        this.scene = scene;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        this.clipboard.copy(this.objects);
        this.objects.forEach(obj => this.scene.remove(obj));
    }

    undo(): void {
        this.objects.forEach(obj => this.scene.add(obj));
    }

    getDescription(): string {
        return `Cut ${this.objects.length} object(s)`;
    }
}

export class PasteCommand implements ICommand {
    private pastedObjects: DrawingObject[] = [];
    private scene: Scene;
    private clipboard: Clipboard;

    constructor(scene: Scene) {
        this.scene = scene;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        if (this.clipboard.isEmpty()) {
            return;
        }

        this.pastedObjects = this.clipboard.paste();
        this.pastedObjects.forEach(obj => this.scene.add(obj));
    }

    undo(): void {
        this.pastedObjects.forEach(obj => this.scene.remove(obj));
        this.pastedObjects = [];
    }

    getDescription(): string {
        return `Paste ${this.pastedObjects.length} object(s)`;
    }
}

export class DuplicateCommand implements ICommand {
    private originalObjects: DrawingObject[];
    private duplicatedObjects: DrawingObject[] = [];
    private scene: Scene;

    constructor(objects: DrawingObject[], scene: Scene) {
        this.originalObjects = objects;
        this.scene = scene;
    }

    execute(): void {
        this.duplicatedObjects = this.originalObjects.map(obj => ({
            ...structuredClone(obj),
            id: `${obj.type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            x: obj.x + 20,
            y: obj.y + 20
        }));

        this.duplicatedObjects.forEach(obj => this.scene.add(obj));
    }

    undo(): void {
        this.duplicatedObjects.forEach(obj => this.scene.remove(obj));
        this.duplicatedObjects = [];
    }

    getDescription(): string {
        return `Duplicate ${this.originalObjects.length} object(s)`;
    }
}
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm --filter @canvas-kit/core test`
Expected: 30개 통과

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/clipboard.ts
git commit -m "fix(core): deep copy with structuredClone, implement CopyCommand.undo(), add getClipboardData()"
```

---

## Task 4: hit-test.ts — Path/Line bounding box 지원

**Files:**
- Modify: `packages/core/src/hit-test.ts`

- [ ] **Step 1: isPointInObject에 Path/Line 케이스 추가**

`packages/core/src/hit-test.ts`의 import 줄을 수정하고 메서드를 추가:

```typescript
import type { DrawingObject, Rect, Circle, Text, Path, Line } from './types';

export class HitTest {
    static isPointInRect(x: number, y: number, rect: Rect): boolean {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }

    static isPointInCircle(x: number, y: number, circle: Circle): boolean {
        const dx = x - circle.x;
        const dy = y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circle.radius;
    }

    static isPointInText(x: number, y: number, text: Text): boolean {
        const fontSize = text.fontSize || 16;
        const textWidth = text.text.length * fontSize * 0.6;
        const textHeight = fontSize;

        return (
            x >= text.x &&
            x <= text.x + textWidth &&
            y >= text.y - textHeight &&
            y <= text.y
        );
    }

    static isPointInPolyline(x: number, y: number, points: number[]): boolean {
        if (points.length < 4) return false;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < points.length - 1; i += 2) {
            minX = Math.min(minX, points[i]);
            maxX = Math.max(maxX, points[i]);
            minY = Math.min(minY, points[i + 1]);
            maxY = Math.max(maxY, points[i + 1]);
        }
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    static isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
        switch (obj.type) {
            case 'rect':
                return this.isPointInRect(x, y, obj as Rect);
            case 'circle':
                return this.isPointInCircle(x, y, obj as Circle);
            case 'text':
                return this.isPointInText(x, y, obj as Text);
            case 'path':
                return this.isPointInPolyline(x, y, (obj as Path).points);
            case 'line':
                return this.isPointInPolyline(x, y, (obj as Line).points);
            default:
                return false;
        }
    }

    static getObjectsAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject[] {
        return objects.filter(obj => this.isPointInObject(x, y, obj));
    }

    static getTopObjectAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject | null {
        const hitObjects = this.getObjectsAtPoint(x, y, objects);
        return hitObjects.length > 0 ? hitObjects[hitObjects.length - 1] : null;
    }
}
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm --filter @canvas-kit/core test`
Expected: 30개 통과

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/hit-test.ts
git commit -m "fix(core): add Path/Line bounding box hit-test support"
```

---

## Task 5: commands.ts — CommandHistory 이벤트 에미터

**Files:**
- Modify: `packages/core/src/commands.ts`

- [ ] **Step 1: CommandHistoryEvent 타입과 이벤트 메서드를 CommandHistory에 추가**

`packages/core/src/commands.ts`에서 `CommandHistory` 클래스 위에 인터페이스를 추가하고, 클래스 내부를 수정:

```typescript
import type { DrawingObject } from './types';
import { Scene } from './scene';

export interface ICommand {
    execute(): void;
    undo(): void;
    getDescription(): string;
}

export interface CommandHistoryEvent {
    type: 'execute' | 'undo' | 'redo' | 'clear';
    canUndo: boolean;
    canRedo: boolean;
}

export class MoveCommand implements ICommand {
    private objectId: string;
    private oldPosition: { x: number; y: number };
    private newPosition: { x: number; y: number };
    private scene: Scene;

    constructor(
        object: DrawingObject,
        oldPosition: { x: number; y: number },
        newPosition: { x: number; y: number },
        scene: Scene
    ) {
        this.objectId = object.id || `${object.type}-${Date.now()}`;
        this.oldPosition = { ...oldPosition };
        this.newPosition = { ...newPosition };
        this.scene = scene;
    }

    execute(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (obj) {
            obj.x = this.newPosition.x;
            obj.y = this.newPosition.y;
        }
    }

    undo(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (obj) {
            obj.x = this.oldPosition.x;
            obj.y = this.oldPosition.y;
        }
    }

    getDescription(): string {
        return `Move object`;
    }
}

export class ResizeCommand implements ICommand {
    private objectId: string;
    private oldSize: any;
    private newSize: any;
    private scene: Scene;

    constructor(object: DrawingObject, oldSize: any, newSize: any, scene: Scene) {
        this.objectId = object.id || `${object.type}-${Date.now()}`;
        this.oldSize = { ...oldSize };
        this.newSize = { ...newSize };
        this.scene = scene;
    }

    execute(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (!obj) return;

        if (obj.type === 'rect') {
            (obj as any).width = this.newSize.width;
            (obj as any).height = this.newSize.height;
        } else if (obj.type === 'circle') {
            (obj as any).radius = this.newSize.radius;
        }
        obj.x = this.newSize.x;
        obj.y = this.newSize.y;
    }

    undo(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (!obj) return;

        if (obj.type === 'rect') {
            (obj as any).width = this.oldSize.width;
            (obj as any).height = this.oldSize.height;
        } else if (obj.type === 'circle') {
            (obj as any).radius = this.oldSize.radius;
        }
        obj.x = this.oldSize.x;
        obj.y = this.oldSize.y;
    }

    getDescription(): string {
        return `Resize object`;
    }
}

export class AddCommand implements ICommand {
    private object: DrawingObject;
    private scene: Scene;

    constructor(object: DrawingObject, scene: Scene) {
        this.object = object;
        this.scene = scene;
    }

    execute(): void {
        this.scene.add(this.object);
    }

    undo(): void {
        this.scene.remove(this.object);
    }

    getDescription(): string {
        return `Add ${this.object.type} object`;
    }
}

export class DeleteCommand implements ICommand {
    private object: DrawingObject;
    private scene: Scene;

    constructor(object: DrawingObject, scene: Scene) {
        this.object = object;
        this.scene = scene;
    }

    execute(): void {
        this.scene.remove(this.object);
    }

    undo(): void {
        this.scene.add(this.object);
    }

    getDescription(): string {
        return `Delete ${this.object.type} object`;
    }
}

export class CommandHistory {
    private undoStack: ICommand[] = [];
    private redoStack: ICommand[] = [];
    private maxHistorySize: number;
    private listeners: ((event: CommandHistoryEvent) => void)[] = [];

    constructor(maxHistorySize: number = 50) {
        this.maxHistorySize = maxHistorySize;
    }

    addEventListener(listener: (event: CommandHistoryEvent) => void): void {
        this.listeners.push(listener);
    }

    removeEventListener(listener: (event: CommandHistoryEvent) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notify(type: CommandHistoryEvent['type']): void {
        const event: CommandHistoryEvent = {
            type,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
        this.listeners.forEach(l => l(event));
    }

    execute(command: ICommand): void {
        command.execute();
        this.redoStack = [];
        this.undoStack.push(command);

        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        this.notify('execute');
    }

    undo(): boolean {
        if (this.undoStack.length === 0) {
            return false;
        }

        const command = this.undoStack.pop()!;
        command.undo();
        this.redoStack.push(command);
        this.notify('undo');
        return true;
    }

    redo(): boolean {
        if (this.redoStack.length === 0) {
            return false;
        }

        const command = this.redoStack.pop()!;
        command.execute();
        this.undoStack.push(command);
        this.notify('redo');
        return true;
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.notify('clear');
    }

    getStatus() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            lastCommand: this.undoStack[this.undoStack.length - 1]?.getDescription()
        };
    }
}
```

주요 변경: `CommandHistoryEvent` 추가, `addEventListener/removeEventListener/notify` 추가, 불필요한 `maxMemoryUsage`/`checkMemoryUsage` 제거, `execute/undo/redo/clear` 끝에 `notify()` 호출.

- [ ] **Step 2: CommandHistoryEvent를 core index.ts에서 export**

`packages/core/src/index.ts`에서 `export * from './commands'` 가 이미 있으므로 자동으로 export됨. 확인만:

```bash
grep -n "CommandHistoryEvent" packages/core/src/index.ts
# 결과 없으면 OK — export * from './commands'가 포함
```

- [ ] **Step 3: 테스트 실행**

Run: `pnpm --filter @canvas-kit/core test`
Expected: 30개 통과

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/commands.ts
git commit -m "feat(core): add CommandHistory event emitter (addEventListener/removeEventListener)"
```

---

## Task 6: commands.test.ts 작성

**Files:**
- Create: `packages/core/src/commands.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    MoveCommand,
    ResizeCommand,
    AddCommand,
    DeleteCommand,
    CommandHistory
} from './commands';
import { Scene } from './scene';

describe('MoveCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: moves object to new position', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 100, y: 200 }, scene);
        cmd.execute();
        expect(obj.x).toBe(100);
        expect(obj.y).toBe(200);
    });

    it('undo: restores original position', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 20, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 10, y: 20 }, { x: 100, y: 200 }, scene);
        cmd.execute();
        cmd.undo();
        expect(obj.x).toBe(10);
        expect(obj.y).toBe(20);
    });

    it('getDescription: returns descriptive string', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        expect(cmd.getDescription()).toBe('Move object');
    });

    it('execute: does nothing if object not found in scene', () => {
        const obj = { id: 'missing', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        expect(() => cmd.execute()).not.toThrow();
    });
});

describe('ResizeCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: resizes rect to new dimensions', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 0, y: 0, width: 50, height: 50 },
            { x: 10, y: 10, width: 100, height: 200 },
            scene
        );
        cmd.execute();
        expect(obj.width).toBe(100);
        expect(obj.height).toBe(200);
        expect(obj.x).toBe(10);
        expect(obj.y).toBe(10);
    });

    it('undo: restores original rect dimensions', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 0, y: 0, width: 50, height: 50 },
            { x: 10, y: 10, width: 100, height: 200 },
            scene
        );
        cmd.execute();
        cmd.undo();
        expect(obj.width).toBe(50);
        expect(obj.height).toBe(50);
        expect(obj.x).toBe(0);
        expect(obj.y).toBe(0);
    });

    it('execute: resizes circle radius', () => {
        const obj = { id: 'c1', type: 'circle' as const, x: 50, y: 50, radius: 25 };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 50, y: 50, radius: 25 },
            { x: 60, y: 60, radius: 50 },
            scene
        );
        cmd.execute();
        expect(obj.radius).toBe(50);
    });
});

describe('AddCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: adds object to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new AddCommand(obj, scene);
        cmd.execute();
        expect(scene.getObjects()).toContain(obj);
    });

    it('undo: removes object from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new AddCommand(obj, scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects()).not.toContain(obj);
    });

    it('getDescription: includes object type', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new AddCommand(obj, scene);
        expect(cmd.getDescription()).toBe('Add rect object');
    });
});

describe('DeleteCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: removes object from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DeleteCommand(obj, scene);
        cmd.execute();
        expect(scene.getObjects()).not.toContain(obj);
    });

    it('undo: re-adds object to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DeleteCommand(obj, scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects()).toContain(obj);
    });
});

describe('CommandHistory', () => {
    let scene: Scene;
    let history: CommandHistory;

    beforeEach(() => {
        scene = new Scene();
        history = new CommandHistory();
    });

    it('execute: runs command and adds to undo stack', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        history.execute(cmd);
        expect(obj.x).toBe(10);
        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
    });

    it('undo: undoes last command and moves to redo stack', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        const result = history.undo();
        expect(result).toBe(true);
        expect(obj.x).toBe(0);
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(true);
    });

    it('redo: re-executes undone command', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        history.undo();
        const result = history.redo();
        expect(result).toBe(true);
        expect(obj.x).toBe(10);
        expect(history.canRedo()).toBe(false);
    });

    it('execute: clears redo stack on new command', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        history.undo();
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 20, y: 20 }, scene));
        expect(history.canRedo()).toBe(false);
    });

    it('undo: returns false when stack is empty', () => {
        expect(history.undo()).toBe(false);
    });

    it('redo: returns false when stack is empty', () => {
        expect(history.redo()).toBe(false);
    });

    it('clear: empties both stacks', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        history.clear();
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(false);
    });

    it('maxHistorySize: removes oldest command when exceeded', () => {
        const smallHistory = new CommandHistory(2);
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        smallHistory.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 1, y: 0 }, scene));
        smallHistory.execute(new MoveCommand(obj, { x: 1, y: 0 }, { x: 2, y: 0 }, scene));
        smallHistory.execute(new MoveCommand(obj, { x: 2, y: 0 }, { x: 3, y: 0 }, scene));
        expect(smallHistory.getStatus().undoCount).toBe(2);
    });

    it('getStatus: returns correct status object', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        history.execute(cmd);
        const status = history.getStatus();
        expect(status.undoCount).toBe(1);
        expect(status.redoCount).toBe(0);
        expect(status.canUndo).toBe(true);
        expect(status.canRedo).toBe(false);
        expect(status.lastCommand).toBe('Move object');
    });

    describe('EventEmitter', () => {
        it('addEventListener: fires on execute with correct event', () => {
            const listener = vi.fn();
            history.addEventListener(listener);
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith({
                type: 'execute',
                canUndo: true,
                canRedo: false
            });
        });

        it('addEventListener: fires on undo', () => {
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            const listener = vi.fn();
            history.addEventListener(listener);
            history.undo();
            expect(listener).toHaveBeenCalledWith({
                type: 'undo',
                canUndo: false,
                canRedo: true
            });
        });

        it('addEventListener: fires on redo', () => {
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            history.undo();
            const listener = vi.fn();
            history.addEventListener(listener);
            history.redo();
            expect(listener).toHaveBeenCalledWith({
                type: 'redo',
                canUndo: true,
                canRedo: false
            });
        });

        it('addEventListener: fires on clear', () => {
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            const listener = vi.fn();
            history.addEventListener(listener);
            history.clear();
            expect(listener).toHaveBeenCalledWith({
                type: 'clear',
                canUndo: false,
                canRedo: false
            });
        });

        it('removeEventListener: stops firing after removal', () => {
            const listener = vi.fn();
            history.addEventListener(listener);
            history.removeEventListener(listener);
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm --filter @canvas-kit/core test`
Expected: 새 테스트 포함 모두 통과

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/commands.test.ts
git commit -m "test(core): add CommandHistory and command classes test coverage"
```

---

## Task 7: clipboard.test.ts 작성

**Files:**
- Create: `packages/core/src/clipboard.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Clipboard, CopyCommand, CutCommand, PasteCommand, DuplicateCommand } from './clipboard';
import { Scene } from './scene';

// Clipboard는 싱글톤이므로 테스트마다 클리어
beforeEach(() => {
    Clipboard.getInstance().clear();
});

describe('Clipboard', () => {
    it('copy: stores deep copies of objects', () => {
        const obj = { id: 'p1', type: 'path' as const, x: 0, y: 0, points: [0, 0, 10, 10] };
        const clipboard = Clipboard.getInstance();
        clipboard.copy([obj]);
        // 원본 points 변경 후 클립보드 데이터는 영향 없어야 함
        obj.points[0] = 999;
        const data = clipboard.getClipboardData();
        expect(data[0].points[0]).toBe(0);
    });

    it('paste: returns new objects with offset position and new id', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 20, width: 50, height: 50 };
        const clipboard = Clipboard.getInstance();
        clipboard.copy([obj]);
        const pasted = clipboard.paste();
        expect(pasted[0].id).not.toBe('r1');
        expect(pasted[0].x).toBe(30);
        expect(pasted[0].y).toBe(40);
    });

    it('paste: does not mutate clipboard data', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 20, width: 50, height: 50 };
        const clipboard = Clipboard.getInstance();
        clipboard.copy([obj]);
        clipboard.paste();
        clipboard.paste();
        expect(clipboard.getCount()).toBe(1);
    });

    it('isEmpty: returns true when empty', () => {
        expect(Clipboard.getInstance().isEmpty()).toBe(true);
    });

    it('isEmpty: returns false after copy', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        expect(Clipboard.getInstance().isEmpty()).toBe(false);
    });

    it('getCount: returns number of copied objects', () => {
        const objs = [
            { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 },
            { id: 'c1', type: 'circle' as const, x: 50, y: 50, radius: 25 }
        ];
        Clipboard.getInstance().copy(objs);
        expect(Clipboard.getInstance().getCount()).toBe(2);
    });

    it('clear: empties clipboard', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        Clipboard.getInstance().clear();
        expect(Clipboard.getInstance().isEmpty()).toBe(true);
    });

    it('getClipboardData: returns deep copies', () => {
        const obj = { id: 'p1', type: 'path' as const, x: 0, y: 0, points: [1, 2, 3, 4] };
        Clipboard.getInstance().copy([obj]);
        const data = Clipboard.getInstance().getClipboardData();
        data[0].points[0] = 999;
        const data2 = Clipboard.getInstance().getClipboardData();
        expect(data2[0].points[0]).toBe(1);
    });
});

describe('CopyCommand', () => {
    it('execute: copies objects to clipboard', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new CopyCommand([obj]);
        cmd.execute();
        expect(Clipboard.getInstance().isEmpty()).toBe(false);
    });

    it('undo: restores previous clipboard state', () => {
        const obj1 = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const obj2 = { id: 'c1', type: 'circle' as const, x: 50, y: 50, radius: 25 };
        // 먼저 obj1을 클립보드에 복사
        new CopyCommand([obj1]).execute();
        // obj2 복사 (undo 시 obj1 복원)
        const cmd2 = new CopyCommand([obj2]);
        cmd2.execute();
        expect(Clipboard.getInstance().getCount()).toBe(1);
        cmd2.undo();
        // 클립보드에 obj1이 다시 있어야 함
        const data = Clipboard.getInstance().getClipboardData();
        expect(data[0].id).toBe('r1');
    });

    it('getDescription: includes count', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        expect(new CopyCommand([obj]).getDescription()).toBe('Copy 1 object(s)');
    });
});

describe('CutCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: removes objects from scene and copies to clipboard', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new CutCommand([obj], scene);
        cmd.execute();
        expect(scene.getObjects()).not.toContain(obj);
        expect(Clipboard.getInstance().isEmpty()).toBe(false);
    });

    it('undo: re-adds objects to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new CutCommand([obj], scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects()).toContain(obj);
    });
});

describe('PasteCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: adds pasted objects to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        const cmd = new PasteCommand(scene);
        cmd.execute();
        expect(scene.getObjects().length).toBe(1);
        expect(scene.getObjects()[0].id).not.toBe('r1');
    });

    it('execute: does nothing when clipboard is empty', () => {
        const cmd = new PasteCommand(scene);
        cmd.execute();
        expect(scene.getObjects().length).toBe(0);
    });

    it('undo: removes pasted objects from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        const cmd = new PasteCommand(scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects().length).toBe(0);
    });
});

describe('DuplicateCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: adds duplicated objects with offset to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 10, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DuplicateCommand([obj], scene);
        cmd.execute();
        expect(scene.getObjects().length).toBe(2);
        const dup = scene.getObjects()[1];
        expect(dup.x).toBe(30);
        expect(dup.y).toBe(30);
        expect(dup.id).not.toBe('r1');
    });

    it('execute: deep copies points array for path objects', () => {
        const obj = { id: 'p1', type: 'path' as const, x: 0, y: 0, points: [0, 0, 10, 10] };
        scene.add(obj);
        const cmd = new DuplicateCommand([obj], scene);
        cmd.execute();
        const dup = scene.getObjects()[1] as any;
        dup.points[0] = 999;
        expect(obj.points[0]).toBe(0);
    });

    it('undo: removes duplicated objects from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DuplicateCommand([obj], scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects().length).toBe(1);
        expect(scene.getObjects()[0]).toBe(obj);
    });
});
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm --filter @canvas-kit/core test`
Expected: 전체 통과

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/clipboard.test.ts
git commit -m "test(core): add Clipboard and clipboard command test coverage"
```

---

## Task 8: AdvancedDesigner — 폴링 제거 + rect/circle 구현

**Files:**
- Modify: `packages/designer/src/AdvancedDesigner.tsx`

- [ ] **Step 1: AdvancedDesigner.tsx 전체를 다음으로 교체**

```tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Rect as KonvaRect, Circle as KonvaCircle } from 'react-konva';
import { Scene, CommandHistory, AddCommand } from '@canvas-kit/core';
import type { DrawingObject, CommandHistoryEvent } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';
import { FreeDrawingCanvas } from './FreeDrawingCanvas';
import { EditableText } from './EditableText';

export type DesignerTool = 'select' | 'draw' | 'text' | 'rect' | 'circle';

export interface DrawingTool {
    mode: 'brush' | 'eraser';
    color: string;
    width: number;
}

export interface TextObject {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
    width: number;
}

interface PreviewShape {
    type: 'rect' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
}

export interface AdvancedDesignerProps {
    width: number;
    height: number;
    scene: Scene;
    onSceneChange?: (scene: Scene) => void;
    onSelectionChange?: (selectedObjects: DrawingObject[]) => void;
    commandHistory?: CommandHistory;
    showToolbar?: boolean;
    enableKeyboardShortcuts?: boolean;
    enableUndoRedo?: boolean;
}

export const AdvancedDesigner: React.FC<AdvancedDesignerProps> = ({
    width,
    height,
    scene,
    onSceneChange,
    onSelectionChange,
    commandHistory = new CommandHistory(),
    showToolbar = true,
    enableKeyboardShortcuts = true,
    enableUndoRedo = true
}) => {
    const [currentTool, setCurrentTool] = useState<DesignerTool>('select');
    const [drawingTool, setDrawingTool] = useState<DrawingTool>({
        mode: 'brush',
        color: '#000000',
        width: 5
    });
    const [textObjects, setTextObjects] = useState<TextObject[]>([]);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [historyState, setHistoryState] = useState({
        canUndo: commandHistory.canUndo(),
        canRedo: commandHistory.canRedo()
    });

    // rect/circle 그리기 상태
    const [drawStartPoint, setDrawStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [previewShape, setPreviewShape] = useState<PreviewShape | null>(null);

    const stageRef = useRef<any>(null);

    // CommandHistory 이벤트 구독 (폴링 대체)
    useEffect(() => {
        if (!enableUndoRedo) return;

        const handleHistoryChange = (event: CommandHistoryEvent) => {
            setHistoryState({ canUndo: event.canUndo, canRedo: event.canRedo });
        };

        commandHistory.addEventListener(handleHistoryChange);
        return () => commandHistory.removeEventListener(handleHistoryChange);
    }, [commandHistory, enableUndoRedo]);

    // 키보드 단축키 처리
    useEffect(() => {
        if (!enableKeyboardShortcuts) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isCtrl = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            if (enableUndoRedo && isCtrl) {
                if (e.key === 'z' && !isShift) {
                    e.preventDefault();
                    commandHistory.undo();
                } else if (e.key === 'y' || (e.key === 'z' && isShift)) {
                    e.preventDefault();
                    commandHistory.redo();
                }
            }

            if (!isCtrl && !isShift) {
                switch (e.key) {
                    case '1': e.preventDefault(); setCurrentTool('select'); break;
                    case '2': e.preventDefault(); setCurrentTool('draw'); break;
                    case '3': e.preventDefault(); setCurrentTool('text'); break;
                    case '4': e.preventDefault(); setCurrentTool('rect'); break;
                    case '5': e.preventDefault(); setCurrentTool('circle'); break;
                    case 'Escape': e.preventDefault(); setCurrentTool('select'); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableKeyboardShortcuts, enableUndoRedo, commandHistory]);

    const handleToolChange = useCallback((tool: DesignerTool) => {
        setCurrentTool(tool);
        setDrawStartPoint(null);
        setPreviewShape(null);
        if (tool !== 'text') {
            setSelectedTextId(null);
        }
    }, []);

    const handleDrawingToolChange = useCallback((tool: DrawingTool) => {
        setDrawingTool(tool);
    }, []);

    // 텍스트 관련 핸들러
    const handleTextChange = useCallback((id: string, newText: string) => {
        setTextObjects(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
    }, []);

    const handleTextSelect = useCallback((id: string) => {
        setSelectedTextId(prev => prev === id ? null : id);
    }, []);

    const handleTextTransform = useCallback((id: string, attrs: any) => {
        setTextObjects(prev => prev.map(t => t.id === id ? { ...t, ...attrs } : t));
    }, []);

    const addTextAtPosition = useCallback((x: number, y: number) => {
        const newText: TextObject = {
            id: `text-${Date.now()}`,
            x, y,
            text: 'New text',
            fontSize: 20,
            fontFamily: 'Arial',
            fill: '#000000',
            width: 200
        };
        setTextObjects(prev => [...prev, newText]);
        setSelectedTextId(newText.id);
    }, []);

    // rect/circle 드래그 그리기 핸들러
    const handleShapeMouseDown = useCallback((e: any) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        setDrawStartPoint({ x: pos.x, y: pos.y });
    }, []);

    const handleShapeMouseMove = useCallback((e: any) => {
        if (!drawStartPoint) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        if (currentTool === 'rect') {
            const x = Math.min(drawStartPoint.x, pos.x);
            const y = Math.min(drawStartPoint.y, pos.y);
            const w = Math.abs(pos.x - drawStartPoint.x);
            const h = Math.abs(pos.y - drawStartPoint.y);
            setPreviewShape({ type: 'rect', x, y, width: w, height: h, radius: 0 });
        } else if (currentTool === 'circle') {
            const dx = pos.x - drawStartPoint.x;
            const dy = pos.y - drawStartPoint.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            setPreviewShape({
                type: 'circle',
                x: drawStartPoint.x,
                y: drawStartPoint.y,
                width: 0,
                height: 0,
                radius
            });
        }
    }, [drawStartPoint, currentTool]);

    const handleShapeMouseUp = useCallback(() => {
        if (!drawStartPoint || !previewShape) {
            setDrawStartPoint(null);
            setPreviewShape(null);
            return;
        }

        const minSize = 5;
        if (previewShape.type === 'rect' && (previewShape.width < minSize || previewShape.height < minSize)) {
            setDrawStartPoint(null);
            setPreviewShape(null);
            return;
        }
        if (previewShape.type === 'circle' && previewShape.radius < minSize) {
            setDrawStartPoint(null);
            setPreviewShape(null);
            return;
        }

        let newObj: DrawingObject;
        if (previewShape.type === 'rect') {
            newObj = {
                id: `rect-${Date.now()}`,
                type: 'rect',
                x: previewShape.x,
                y: previewShape.y,
                width: previewShape.width,
                height: previewShape.height,
                fill: '#4A90E2',
                stroke: '#2563EB',
                strokeWidth: 1
            };
        } else {
            newObj = {
                id: `circle-${Date.now()}`,
                type: 'circle',
                x: previewShape.x,
                y: previewShape.y,
                radius: previewShape.radius,
                fill: '#E24A4A',
                stroke: '#B91C1C',
                strokeWidth: 1
            };
        }

        const cmd = new AddCommand(newObj, scene);
        commandHistory.execute(cmd);
        onSceneChange?.(scene);

        setDrawStartPoint(null);
        setPreviewShape(null);
    }, [drawStartPoint, previewShape, scene, commandHistory, onSceneChange]);

    // Stage 클릭 핸들러 (text 도구)
    const handleStageClick = useCallback((e: any) => {
        if (currentTool === 'text') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                addTextAtPosition(pos.x, pos.y);
            }
        }
    }, [currentTool, addTextAtPosition]);

    const tools = [
        { id: 'select', label: '선택', icon: '↖️', shortcut: '1' },
        { id: 'draw', label: '그리기', icon: '✏️', shortcut: '2' },
        { id: 'text', label: '텍스트', icon: '📝', shortcut: '3' },
        { id: 'rect', label: '사각형', icon: '⬜', shortcut: '4' },
        { id: 'circle', label: '원', icon: '⭕', shortcut: '5' }
    ];

    const brushColors = [
        '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
        '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#888888'
    ];

    const isDrawingShapeTool = currentTool === 'rect' || currentTool === 'circle';

    return (
        <div className="flex flex-col h-full">
            {showToolbar && (
                <div className="bg-gray-100 border-b border-gray-300 p-3">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                            {tools.map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => handleToolChange(tool.id as DesignerTool)}
                                    className={`px-3 py-2 rounded transition-colors ${currentTool === tool.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white hover:bg-gray-50 border border-gray-300'
                                        }`}
                                    title={`${tool.label} ${enableKeyboardShortcuts ? `(${tool.shortcut})` : ''}`}
                                >
                                    <span className="mr-1">{tool.icon}</span>
                                    {tool.label}
                                    {enableKeyboardShortcuts && (
                                        <kbd className="ml-2 px-1 py-0.5 text-xs bg-gray-200 text-gray-600 rounded border">
                                            {tool.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            ))}
                        </div>

                        {currentTool === 'draw' && (
                            <>
                                <div className="h-6 w-px bg-gray-300" />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDrawingToolChange({ ...drawingTool, mode: 'brush' })}
                                        className={`px-2 py-1 rounded text-sm ${drawingTool.mode === 'brush' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'}`}
                                    >
                                        🖌️ 브러시
                                    </button>
                                    <button
                                        onClick={() => handleDrawingToolChange({ ...drawingTool, mode: 'eraser' })}
                                        className={`px-2 py-1 rounded text-sm ${drawingTool.mode === 'eraser' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'}`}
                                    >
                                        🧹 지우개
                                    </button>
                                </div>
                                {drawingTool.mode === 'brush' && (
                                    <div className="flex gap-1">
                                        {brushColors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => handleDrawingToolChange({ ...drawingTool, color })}
                                                className={`w-6 h-6 rounded border-2 ${drawingTool.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">두께:</span>
                                    <input
                                        type="range" min="1" max="20"
                                        value={drawingTool.width}
                                        onChange={(e) => handleDrawingToolChange({ ...drawingTool, width: parseInt(e.target.value) })}
                                        className="w-20"
                                    />
                                    <span className="text-sm text-gray-600 w-6">{drawingTool.width}</span>
                                </div>
                            </>
                        )}

                        {enableUndoRedo && (
                            <>
                                <div className="h-6 w-px bg-gray-300" />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => commandHistory.undo()}
                                        disabled={!historyState.canUndo}
                                        className="px-3 py-1 rounded text-sm bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        title={`실행 취소 ${enableKeyboardShortcuts ? '(Ctrl+Z)' : ''}`}
                                    >
                                        ↶ 실행 취소
                                    </button>
                                    <button
                                        onClick={() => commandHistory.redo()}
                                        disabled={!historyState.canRedo}
                                        className="px-3 py-1 rounded text-sm bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        title={`다시 실행 ${enableKeyboardShortcuts ? '(Ctrl+Y)' : ''}`}
                                    >
                                        ↷ 다시 실행
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 relative">
                {currentTool === 'select' && (
                    <KonvaDesigner
                        width={width}
                        height={height}
                        scene={scene}
                        onSceneChange={onSceneChange}
                        onSelectionChange={onSelectionChange}
                        enableKeyboardShortcuts={enableKeyboardShortcuts}
                        enableTextEditing={true}
                        enableMultiSelect={true}
                        enableRectangleSelection={true}
                    />
                )}

                {(currentTool === 'draw' || currentTool === 'text') && (
                    <Stage
                        width={width}
                        height={height}
                        ref={stageRef}
                        onClick={handleStageClick}
                    >
                        <Layer>
                            {currentTool === 'draw' && (
                                <FreeDrawingCanvas
                                    width={width}
                                    height={height}
                                    tool={drawingTool}
                                    stage={stageRef.current || undefined}
                                />
                            )}
                            {currentTool === 'text' && textObjects.map(text => (
                                <EditableText
                                    key={text.id}
                                    x={text.x}
                                    y={text.y}
                                    text={text.text}
                                    fontSize={text.fontSize}
                                    fontFamily={text.fontFamily}
                                    fill={text.fill}
                                    width={text.width}
                                    isSelected={selectedTextId === text.id}
                                    onTextChange={(newText) => handleTextChange(text.id, newText)}
                                    onSelect={() => handleTextSelect(text.id)}
                                    onTransform={(attrs) => handleTextTransform(text.id, attrs)}
                                />
                            ))}
                        </Layer>
                    </Stage>
                )}

                {isDrawingShapeTool && (
                    <Stage
                        width={width}
                        height={height}
                        ref={stageRef}
                        style={{ cursor: 'crosshair' }}
                        onMouseDown={handleShapeMouseDown}
                        onMouseMove={handleShapeMouseMove}
                        onMouseUp={handleShapeMouseUp}
                    >
                        <Layer>
                            {previewShape?.type === 'rect' && (
                                <KonvaRect
                                    x={previewShape.x}
                                    y={previewShape.y}
                                    width={previewShape.width}
                                    height={previewShape.height}
                                    stroke="#2563EB"
                                    strokeWidth={1}
                                    dash={[4, 4]}
                                    fill="rgba(74, 144, 226, 0.1)"
                                    listening={false}
                                />
                            )}
                            {previewShape?.type === 'circle' && (
                                <KonvaCircle
                                    x={previewShape.x}
                                    y={previewShape.y}
                                    radius={previewShape.radius}
                                    stroke="#B91C1C"
                                    strokeWidth={1}
                                    dash={[4, 4]}
                                    fill="rgba(226, 74, 74, 0.1)"
                                    listening={false}
                                />
                            )}
                        </Layer>
                    </Stage>
                )}

                {currentTool === 'text' && (
                    <div className="absolute bottom-4 left-4 bg-blue-100 border border-blue-300 rounded p-2 text-sm">
                        💡 캔버스를 클릭하여 텍스트를 추가하세요
                    </div>
                )}

                {isDrawingShapeTool && (
                    <div className="absolute bottom-4 left-4 bg-green-100 border border-green-300 rounded p-2 text-sm">
                        💡 드래그하여 {currentTool === 'rect' ? '사각형' : '원'}을 그리세요
                    </div>
                )}

                {enableKeyboardShortcuts && (
                    <div className="absolute bottom-4 right-4 bg-gray-100 border border-gray-300 rounded p-3 text-xs max-w-xs">
                        <h4 className="font-medium mb-2">⌨️ 키보드 단축키</h4>
                        <div className="space-y-1">
                            {enableUndoRedo && (
                                <>
                                    <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Z</kbd> 실행 취소</div>
                                    <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Y</kbd> 다시 실행</div>
                                </>
                            )}
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">1</kbd> 선택 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">2</kbd> 그리기 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">3</kbd> 텍스트 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">4</kbd> 사각형 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">5</kbd> 원 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">Esc</kbd> 선택 도구로 복귀</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
```

- [ ] **Step 2: 빌드 확인**

Run: `pnpm --filter @canvas-kit/designer build`
Expected: 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add packages/designer/src/AdvancedDesigner.tsx
git commit -m "feat(designer): implement rect/circle drag-draw, replace polling with CommandHistory events"
```

---

## Task 9: 전체 빌드 및 테스트 통과 확인

**Files:** 없음 (검증 단계)

- [ ] **Step 1: 전체 패키지 테스트**

Run: `pnpm -w run test:packages`
Expected:
```
@canvas-kit/core: Test Files X passed
@canvas-kit/viewer: Test Files 1 passed
```

- [ ] **Step 2: 전체 빌드**

Run: `pnpm build:all`
Expected: 모든 패키지 + site 빌드 성공

- [ ] **Step 3: 통합 커밋 (빌드 결과물 제외)**

```bash
git status
# dist/ 파일이 .gitignore에 포함되어 있으므로 변경 없음
```

---

## Task 10: ARCHITECTURE.md 재작성

**Files:**
- Modify: `docs/ARCHITECTURE.md`

- [ ] **Step 1: 전체 내용 교체**

`docs/ARCHITECTURE.md`를 다음 내용으로 교체:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: rewrite ARCHITECTURE.md to reflect current tech stack (Konva/tsup/Vitest)"
```

---

## Task 11: TASKS.md 현행화 + npm publish plan 완료 처리

**Files:**
- Modify: `docs/TASKS.md`
- Modify: `claudedocs/plans/2026-03-18-npm-publish.md`

- [ ] **Step 1: TASKS.md 대시보드 수정**

`docs/TASKS.md`에서 Phase 3A/3B 관련 미완료 표시를 수정:

Phase 3A-2 Undo/Redo 섹션에서:
```markdown
**3A-2. Undo/Redo 시스템** ⚡ **다음 작업**
```
→
```markdown
**3A-2. Undo/Redo 시스템** ✅ **완료**
```

Phase 3A-3 Copy/Paste 섹션에서:
```markdown
**3A-3. Copy/Paste 기능**
- [ ] **클립보드 관리**
...
```
→ 모든 하위 항목을 `- [x]`로 변경

진행 현황 대시보드에서:
```markdown
- ✅ **Phase 3A**: 100% (Undo/Redo 완료)
- ✅ **Phase 3B**: 100% (Copy/Paste 완료)
```
이미 올바르게 표시된 경우 확인만.

다음 마일스톤 섹션 업데이트:
```markdown
### **다음 마일스톤**
1. ✅ **완료**: Undo/Redo + Copy/Paste + rect/circle 도구 + CommandHistory 이벤트
2. **다음**: Snap & Alignment 시스템
3. **이후**: 이미지 지원 + 성능 최적화
```

- [ ] **Step 2: npm publish plan 체크박스 완료 처리**

`claudedocs/plans/2026-03-18-npm-publish.md`에서 완료된 모든 Step의 `- [ ]`를 `- [x]`로 변경:
- Task 1 Step 1, 2, 3
- Task 2 Step 1, 2, 3, 4, 5
- Task 3 Step 1, 2, 3, 4
- Task 4 (skip으로 표시됨)
- Task 5 Step 1, 2
- Task 6 Step 1, 2, 3

- [ ] **Step 3: Commit**

```bash
git add docs/TASKS.md claudedocs/plans/2026-03-18-npm-publish.md
git commit -m "docs: update TASKS.md dashboard, mark npm publish plan as complete"
```

---

## 최종 검증

- [ ] `pnpm -w run test:packages` — 전체 통과
- [ ] `pnpm build:all` — 빌드 성공
- [ ] `pnpm -w run type-check:core` — 타입 에러 없음
