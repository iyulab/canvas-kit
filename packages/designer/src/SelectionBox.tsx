import React, { useState, useCallback, useRef } from 'react';
import { Rect } from 'react-konva';
import Konva from 'konva';
import type { DrawingObject } from '@canvas-kit/core';

interface SelectionBoxProps {
    isActive: boolean;
    onSelectionComplete: (selectedObjects: DrawingObject[]) => void;
    objects: readonly DrawingObject[];
}

interface SelectionState {
    isSelecting: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}

/**
 * Rectangle Selection 기능을 제공하는 컴포넌트
 * 
 * 사용법:
 * 1. 빈 영역에서 마우스 드래그 시작
 * 2. 드래그하여 선택 영역 표시
 * 3. 마우스 릴리스 시 영역 내 객체들 선택
 */
export const SelectionBox: React.FC<SelectionBoxProps> = ({
    isActive,
    onSelectionComplete,
    objects
}) => {
    const [selection, setSelection] = useState<SelectionState>({
        isSelecting: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    });

    // 객체 ID 생성 (KonvaDesigner와 동일한 로직)
    const getObjectId = (obj: DrawingObject): string => {
        return obj.id || `${obj.type}-${objects.indexOf(obj)}`;
    };

    // 점이 사각형 영역 내부에 있는지 확인
    const isPointInSelection = (x: number, y: number): boolean => {
        const minX = Math.min(selection.startX, selection.endX);
        const maxX = Math.max(selection.startX, selection.endX);
        const minY = Math.min(selection.startY, selection.endY);
        const maxY = Math.max(selection.startY, selection.endY);

        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    };

    // 객체가 선택 영역과 겹치는지 확인
    const isObjectInSelection = (obj: DrawingObject): boolean => {
        switch (obj.type) {
            case 'rect':
                // 사각형의 네 모서리 중 하나라도 선택 영역에 있으면 선택
                return isPointInSelection(obj.x, obj.y) ||
                    isPointInSelection(obj.x + obj.width, obj.y) ||
                    isPointInSelection(obj.x, obj.y + obj.height) ||
                    isPointInSelection(obj.x + obj.width, obj.y + obj.height);

            case 'circle':
                // 원의 중심점이 선택 영역에 있으면 선택
                return isPointInSelection(obj.x, obj.y);

            case 'text':
                // 텍스트의 시작점이 선택 영역에 있으면 선택
                return isPointInSelection(obj.x, obj.y);

            default:
                return false;
        }
    };

    // 드래그 시작
    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isActive) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        setSelection({
            isSelecting: true,
            startX: pointer.x,
            startY: pointer.y,
            endX: pointer.x,
            endY: pointer.y
        });
    }, [isActive]);

    // 드래그 중
    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!selection.isSelecting || !isActive) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        setSelection(prev => ({
            ...prev,
            endX: pointer.x,
            endY: pointer.y
        }));
    }, [selection.isSelecting, isActive]);

    // 드래그 종료
    const handleMouseUp = useCallback(() => {
        if (!selection.isSelecting || !isActive) return;

        // 선택된 객체들 찾기
        const selectedObjects = objects.filter(isObjectInSelection);

        // 선택 완료 콜백 호출
        onSelectionComplete(selectedObjects);

        // 선택 상태 리셋
        setSelection({
            isSelecting: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        });
    }, [selection.isSelecting, isActive, objects, onSelectionComplete, isObjectInSelection]);

    // 선택 영역 계산
    const selectionRect = {
        x: Math.min(selection.startX, selection.endX),
        y: Math.min(selection.startY, selection.endY),
        width: Math.abs(selection.endX - selection.startX),
        height: Math.abs(selection.endY - selection.startY)
    };

    return (
        <>
            {/* 투명한 이벤트 캐처 */}
            <Rect
                x={0}
                y={0}
                width={10000} // 충분히 큰 크기
                height={10000}
                fill="transparent"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                listening={isActive}
            />

            {/* 선택 박스 시각적 표시 */}
            {selection.isSelecting && (
                <Rect
                    x={selectionRect.x}
                    y={selectionRect.y}
                    width={selectionRect.width}
                    height={selectionRect.height}
                    fill="rgba(0, 123, 255, 0.1)"
                    stroke="#007bff"
                    strokeWidth={1}
                    dash={[5, 5]}
                    listening={false}
                />
            )}
        </>
    );
};

export default SelectionBox;
