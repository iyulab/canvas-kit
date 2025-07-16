import type { DrawingObject } from './types';
import { Scene } from './scene';

/**
 * Command 인터페이스
 * Command 패턴을 사용하여 실행 취소 가능한 작업을 정의
 */
export interface ICommand {
    execute(): void;
    undo(): void;
    getDescription(): string;
}

/**
 * 객체 이동 명령
 */
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
        const objects = this.scene.getObjects();
        const obj = objects.find(o => o.id === this.objectId);
        if (obj) {
            obj.x = this.newPosition.x;
            obj.y = this.newPosition.y;
        }
    }

    undo(): void {
        const objects = this.scene.getObjects();
        const obj = objects.find(o => o.id === this.objectId);
        if (obj) {
            obj.x = this.oldPosition.x;
            obj.y = this.oldPosition.y;
        }
    }

    getDescription(): string {
        return `Move object`;
    }
}

/**
 * 객체 크기 변경 명령
 */
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
        const objects = this.scene.getObjects();
        const obj = objects.find(o => o.id === this.objectId);
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
        const objects = this.scene.getObjects();
        const obj = objects.find(o => o.id === this.objectId);
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

/**
 * 객체 추가 명령
 */
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

/**
 * 객체 삭제 명령
 */
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

/**
 * 명령 히스토리 관리자
 * Undo/Redo 스택을 관리하고 메모리 제한을 처리
 */
export class CommandHistory {
    private undoStack: ICommand[] = [];
    private redoStack: ICommand[] = [];
    private maxHistorySize: number;
    private maxMemoryUsage: number; // bytes

    constructor(maxHistorySize: number = 50, maxMemoryUsage: number = 100 * 1024 * 1024) {
        this.maxHistorySize = maxHistorySize;
        this.maxMemoryUsage = maxMemoryUsage;
    }

    /**
     * 명령 실행 및 히스토리에 추가
     */
    execute(command: ICommand): void {
        command.execute();

        // 새 명령 실행 시 redo 스택 클리어
        this.redoStack = [];

        // undo 스택에 추가
        this.undoStack.push(command);

        // 스택 크기 제한
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift(); // 가장 오래된 명령 제거
        }

        // 메모리 사용량 체크 (단순화된 추정)
        this.checkMemoryUsage();
    }

    /**
     * 실행 취소
     */
    undo(): boolean {
        if (this.undoStack.length === 0) {
            return false;
        }

        const command = this.undoStack.pop()!;
        command.undo();
        this.redoStack.push(command);

        return true;
    }

    /**
     * 다시 실행
     */
    redo(): boolean {
        if (this.redoStack.length === 0) {
            return false;
        }

        const command = this.redoStack.pop()!;
        command.execute();
        this.undoStack.push(command);

        return true;
    }

    /**
     * 실행 취소 가능 여부
     */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * 다시 실행 가능 여부
     */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * 히스토리 클리어
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * 현재 히스토리 상태 정보
     */
    getStatus() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            lastCommand: this.undoStack[this.undoStack.length - 1]?.getDescription()
        };
    }

    /**
     * 메모리 사용량 체크 (단순화된 구현)
     */
    private checkMemoryUsage(): void {
        // 실제 구현에서는 더 정확한 메모리 측정이 필요
        const estimatedUsage = (this.undoStack.length + this.redoStack.length) * 1024; // 1KB per command 추정

        if (estimatedUsage > this.maxMemoryUsage) {
            // 오래된 명령들 제거
            const removeCount = Math.floor(this.undoStack.length * 0.2); // 20% 제거
            this.undoStack.splice(0, removeCount);
        }
    }
}
