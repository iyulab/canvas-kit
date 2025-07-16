import type { DrawingObject } from './types';

/**
 * 선택된 객체의 바운딩 박스 정보
 */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * 선택 상태 변경 이벤트
 */
export interface SelectionChangeEvent {
    selected: DrawingObject[];
    added: DrawingObject[];
    removed: DrawingObject[];
}

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type SelectionMode = 'replace' | 'add' | 'subtract';

/**
 * 선택 상태 관리를 담당하는 클래스
 */
export class SelectionManager {
    private selectedObjects: Set<DrawingObject> = new Set();
    private listeners: ((event: SelectionChangeEvent) => void)[] = [];

    /**
     * 객체를 선택에 추가
     */
    addToSelection(obj: DrawingObject): void {
        if (!obj || this.selectedObjects.has(obj)) {
            return;
        }

        this.selectedObjects.add(obj);
        this.notifyChange({
            selected: this.getSelectedObjects(),
            added: [obj],
            removed: []
        });
    }

    /**
     * 객체를 선택에서 제거
     */
    removeFromSelection(obj: DrawingObject): void {
        if (!obj || !this.selectedObjects.has(obj)) {
            return;
        }

        this.selectedObjects.delete(obj);
        this.notifyChange({
            selected: this.getSelectedObjects(),
            added: [],
            removed: [obj]
        });
    }

    /**
     * 단일 객체 선택 (기존 선택 해제 후 새로 선택)
     */
    selectSingle(obj: DrawingObject): void {
        const previousSelected = this.getSelectedObjects();
        this.selectedObjects.clear();

        if (obj) {
            this.selectedObjects.add(obj);
        }

        this.notifyChange({
            selected: this.getSelectedObjects(),
            added: obj ? [obj] : [],
            removed: previousSelected
        });
    }

    /**
     * 객체 선택 토글
     */
    toggleSelection(obj: DrawingObject): void {
        if (!obj) return;

        if (this.selectedObjects.has(obj)) {
            this.removeFromSelection(obj);
        } else {
            this.addToSelection(obj);
        }
    }

    /**
     * 모든 선택 해제
     */
    clearSelection(): void {
        const previousSelected = this.getSelectedObjects();
        this.selectedObjects.clear();

        if (previousSelected.length > 0) {
            this.notifyChange({
                selected: [],
                added: [],
                removed: previousSelected
            });
        }
    }

    /**
     * 선택된 객체들 반환
     */
    getSelectedObjects(): DrawingObject[] {
        return Array.from(this.selectedObjects);
    }

    /**
     * 객체가 선택되었는지 확인
     */
    isSelected(obj: DrawingObject): boolean {
        return this.selectedObjects.has(obj);
    }

    /**
     * 선택된 객체 개수
     */
    getSelectionCount(): number {
        return this.selectedObjects.size;
    }

    /**
     * 선택된 객체들의 전체 바운딩 박스 계산
     */
    getSelectionBounds(): BoundingBox | null {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const obj of selected) {
            const bounds = this.getObjectBounds(obj);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * 개별 객체의 바운딩 박스 계산
     */
    getObjectBounds(obj: DrawingObject): BoundingBox {
        switch (obj.type) {
            case 'rect':
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height
                };
            case 'circle':
                return {
                    x: obj.x - obj.radius,
                    y: obj.y - obj.radius,
                    width: obj.radius * 2,
                    height: obj.radius * 2
                };
            case 'text':
                const fontSize = obj.fontSize || 16;
                const textWidth = obj.text.length * fontSize * 0.6; // 근사치
                const textHeight = fontSize;
                return {
                    x: obj.x,
                    y: obj.y - textHeight,
                    width: textWidth,
                    height: textHeight
                };
            default:
                // 확장성을 위해 기본값 반환
                return {
                    x: (obj as any).x || 0,
                    y: (obj as any).y || 0,
                    width: 0,
                    height: 0
                };
        }
    }

    /**
     * 선택 변경 이벤트 리스너 추가
     */
    addEventListener(listener: (event: SelectionChangeEvent) => void): void {
        this.listeners.push(listener);
    }

    /**
     * 선택 변경 이벤트 리스너 제거
     */
    removeEventListener(listener: (event: SelectionChangeEvent) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 선택 변경 이벤트 발생
     */
    private notifyChange(event: SelectionChangeEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.warn('Selection listener error:', error);
            }
        });
    }

    /**
     * 리소스 정리
     */
    dispose(): void {
        this.selectedObjects.clear();
        this.listeners.length = 0;
    }
}

/**
 * Selection utility functions for Canvas-Kit
 * These functions provide core selection logic that can be used across different components
 */
export class SelectionUtils {
    /**
     * Check if a point is inside a drawing object
     */
    static isPointInObject(point: Point, obj: DrawingObject): boolean {
        switch (obj.type) {
            case 'rect':
                return point.x >= obj.x &&
                    point.x <= obj.x + obj.width &&
                    point.y >= obj.y &&
                    point.y <= obj.y + obj.height;

            case 'circle':
                const dx = point.x - obj.x;
                const dy = point.y - obj.y;
                return Math.sqrt(dx * dx + dy * dy) <= obj.radius;

            case 'text':
                // Simple text bounds check (can be enhanced with actual text metrics)
                const textWidth = (obj.text?.length || 0) * (obj.fontSize || 16) * 0.6;
                const textHeight = obj.fontSize || 16;
                return point.x >= obj.x &&
                    point.x <= obj.x + textWidth &&
                    point.y >= obj.y &&
                    point.y <= obj.y + textHeight;

            case 'path':
                // For paths, check if point is within the bounding box
                if (obj.points && obj.points.length > 0) {
                    // points is [x1, y1, x2, y2, ...]
                    const xs: number[] = [];
                    const ys: number[] = [];
                    for (let i = 0; i < obj.points.length; i += 2) {
                        xs.push(obj.points[i]);
                        ys.push(obj.points[i + 1]);
                    }
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    return point.x >= minX && point.x <= maxX &&
                        point.y >= minY && point.y <= maxY;
                }
                return false;

            case 'line':
                // For lines, check if point is within the bounding box
                if (obj.points && obj.points.length > 0) {
                    // points is [x1, y1, x2, y2, ...]
                    const xs: number[] = [];
                    const ys: number[] = [];
                    for (let i = 0; i < obj.points.length; i += 2) {
                        xs.push(obj.points[i]);
                        ys.push(obj.points[i + 1]);
                    }
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    // Add some tolerance for line selection
                    const tolerance = (obj.strokeWidth || 1) + 3;
                    return point.x >= minX - tolerance && point.x <= maxX + tolerance &&
                        point.y >= minY - tolerance && point.y <= maxY + tolerance;
                }
                return false;

            default:
                return false;
        }
    }

    /**
     * Check if an object is completely inside a rectangle
     */
    static isObjectCompletelyInRect(obj: DrawingObject, rect: Rect): boolean {
        switch (obj.type) {
            case 'rect':
                return obj.x >= rect.x &&
                    obj.y >= rect.y &&
                    obj.x + obj.width <= rect.x + rect.width &&
                    obj.y + obj.height <= rect.y + rect.height;

            case 'circle':
                return obj.x - obj.radius >= rect.x &&
                    obj.y - obj.radius >= rect.y &&
                    obj.x + obj.radius <= rect.x + rect.width &&
                    obj.y + obj.radius <= rect.y + rect.height;

            case 'text':
                const textWidth = (obj.text?.length || 0) * (obj.fontSize || 16) * 0.6;
                const textHeight = obj.fontSize || 16;
                return obj.x >= rect.x &&
                    obj.y >= rect.y &&
                    obj.x + textWidth <= rect.x + rect.width &&
                    obj.y + textHeight <= rect.y + rect.height;

            case 'path':
            case 'line':
                if (obj.points && obj.points.length > 0) {
                    // points is [x1, y1, x2, y2, ...]
                    const xs: number[] = [];
                    const ys: number[] = [];
                    for (let i = 0; i < obj.points.length; i += 2) {
                        xs.push(obj.points[i]);
                        ys.push(obj.points[i + 1]);
                    }
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    return minX >= rect.x && minY >= rect.y &&
                        maxX <= rect.x + rect.width && maxY <= rect.y + rect.height;
                }
                return false;

            default:
                return false;
        }
    }

    /**
     * Check if an object intersects with a rectangle (partial overlap)
     */
    static isObjectIntersectingRect(obj: DrawingObject, rect: Rect): boolean {
        switch (obj.type) {
            case 'rect':
                return !(obj.x > rect.x + rect.width ||
                    obj.x + obj.width < rect.x ||
                    obj.y > rect.y + rect.height ||
                    obj.y + obj.height < rect.y);

            case 'circle':
                // Check if circle intersects with rectangle
                const closestX = Math.max(rect.x, Math.min(obj.x, rect.x + rect.width));
                const closestY = Math.max(rect.y, Math.min(obj.y, rect.y + rect.height));
                const dx = obj.x - closestX;
                const dy = obj.y - closestY;
                return (dx * dx + dy * dy) <= (obj.radius * obj.radius);

            default:
                // For other types, fall back to complete containment check
                return this.isObjectCompletelyInRect(obj, rect);
        }
    }

    /**
     * Get all objects at a specific point, ordered by z-index (last drawn on top)
     */
    static getObjectsAtPoint(point: Point, objects: readonly DrawingObject[]): DrawingObject[] {
        return objects.filter(obj => this.isPointInObject(point, obj));
    }

    /**
     * Get the topmost object at a specific point
     */
    static getTopObjectAtPoint(point: Point, objects: readonly DrawingObject[]): DrawingObject | null {
        const hitObjects = this.getObjectsAtPoint(point, objects);
        return hitObjects.length > 0 ? hitObjects[hitObjects.length - 1] : null;
    }

    /**
     * Get objects within a rectangle based on selection mode
     */
    static getObjectsInRect(
        rect: Rect,
        objects: readonly DrawingObject[],
        mode: 'complete' | 'intersect' = 'complete'
    ): DrawingObject[] {
        const checkFn = mode === 'complete'
            ? this.isObjectCompletelyInRect.bind(this)
            : this.isObjectIntersectingRect.bind(this);

        return objects.filter(obj => checkFn(obj, rect));
    }

    /**
     * Update selection based on mode
     */
    static updateSelection(
        currentSelection: DrawingObject[],
        newObjects: DrawingObject[],
        mode: SelectionMode
    ): DrawingObject[] {
        switch (mode) {
            case 'add':
                const toAdd = newObjects.filter(obj => !currentSelection.includes(obj));
                return [...currentSelection, ...toAdd];

            case 'subtract':
                return currentSelection.filter(obj => !newObjects.includes(obj));

            case 'replace':
            default:
                return newObjects;
        }
    }

    /**
     * Normalize rectangle coordinates (handle negative dimensions)
     */
    static normalizeRect(startX: number, startY: number, endX: number, endY: number): Rect {
        return {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
        };
    }
}
