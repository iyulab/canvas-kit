import type { DrawingObject, Rect, Circle, Text } from './types';

/**
 * 주어진 좌표에서 객체와의 충돌을 검사하는 유틸리티 함수들
 */
export class HitTest {
    /**
     * 점이 사각형 내부에 있는지 확인
     */
    static isPointInRect(x: number, y: number, rect: Rect): boolean {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }

    /**
     * 점이 원 내부에 있는지 확인
     */
    static isPointInCircle(x: number, y: number, circle: Circle): boolean {
        const dx = x - circle.x;
        const dy = y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circle.radius;
    }

    /**
     * 점이 텍스트 영역 내부에 있는지 확인 (근사치)
     */
    static isPointInText(x: number, y: number, text: Text): boolean {
        const fontSize = text.fontSize || 16;
        const textWidth = text.text.length * fontSize * 0.6; // 근사치
        const textHeight = fontSize;

        return (
            x >= text.x &&
            x <= text.x + textWidth &&
            y >= text.y - textHeight &&
            y <= text.y
        );
    }

    /**
     * 점이 객체 내부에 있는지 확인 (타입에 따라 적절한 메서드 호출)
     */
    static isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
        switch (obj.type) {
            case 'rect':
                return this.isPointInRect(x, y, obj as Rect);
            case 'circle':
                return this.isPointInCircle(x, y, obj as Circle);
            case 'text':
                return this.isPointInText(x, y, obj as Text);
            default:
                return false;
        }
    }

    /**
     * 주어진 좌표에서 충돌하는 객체들을 찾음 (위에서부터 순서대로)
     */
    static getObjectsAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject[] {
        return objects.filter(obj => this.isPointInObject(x, y, obj));
    }

    /**
     * 주어진 좌표에서 가장 위에 있는 객체를 찾음 (배열의 마지막 = 가장 위)
     */
    static getTopObjectAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject | null {
        const hitObjects = this.getObjectsAtPoint(x, y, objects);
        return hitObjects.length > 0 ? hitObjects[hitObjects.length - 1] : null;
    }
}
