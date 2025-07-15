import React, { useState, useCallback, useRef } from 'react';
import { Rect } from 'react-konva';
import Konva from 'konva';
import type { DrawingObject, SelectionMode } from '@canvas-kit/core';
import { SelectionUtils } from '@canvas-kit/core';

interface SelectionBoxProps {
    isActive: boolean;
    onSelectionComplete: (rect: { x: number, y: number, width: number, height: number }, mode: SelectionMode) => void;
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

    // 드래그 시작
    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isActive) return;

        // 빈 영역에서만 Rectangle Selection 시작
        const clickedOnEmpty = e.target === e.target.getStage();
        if (!clickedOnEmpty) return;

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
    const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!selection.isSelecting || !isActive) return;

        // 선택 모드 결정
        const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
        const isShiftPressed = e.evt.shiftKey;

        let mode: SelectionMode = 'replace';
        if (isCtrlPressed && isShiftPressed) {
            mode = 'subtract';
        } else if (isCtrlPressed) {
            mode = 'add';
        }

        // 선택 영역 계산
        const rect = SelectionUtils.normalizeRect(
            selection.startX,
            selection.startY,
            selection.endX,
            selection.endY
        );

        // 최소 크기 확인 (너무 작은 드래그는 무시)
        if (rect.width > 3 && rect.height > 3) {
            onSelectionComplete(rect, mode);
        }

        // 선택 상태 리셋
        setSelection({
            isSelecting: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        });
    }, [selection, isActive, onSelectionComplete]);

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
