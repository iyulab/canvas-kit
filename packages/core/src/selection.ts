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
