import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Layer, Line } from 'react-konva';
import Konva from 'konva';

export interface DrawingTool {
    mode: 'brush' | 'eraser';
    color: string;
    width: number;
}

interface FreeDrawingCanvasProps {
    width: number;
    height: number;
    tool: DrawingTool;
    onPathsChange?: (paths: any[]) => void;
    stage?: Konva.Stage; // Stage 참조를 props로 받음
}

export const FreeDrawingCanvas: React.FC<FreeDrawingCanvasProps> = ({
    width,
    height,
    tool,
    onPathsChange,
    stage
}) => {
    const [isPaint, setIsPaint] = useState(false);
    const [paths, setPaths] = useState<any[]>([]);
    const [currentPath, setCurrentPath] = useState<any>(null);

    // 그리기 시작
    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        setIsPaint(true);
        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        const newPath = {
            id: `path-${Date.now()}`,
            tool: tool.mode,
            points: [pos.x, pos.y],
            color: tool.color,
            width: tool.width,
        };

        setCurrentPath(newPath);
    }, [tool]);

    // 그리기 중
    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isPaint || !currentPath) return;

        // 터치 디바이스에서 스크롤 방지
        e.evt.preventDefault();

        const stageRef = e.target.getStage();
        const point = stageRef?.getPointerPosition();
        if (!point) return;

        const newPoints = currentPath.points.concat([point.x, point.y]);
        setCurrentPath({ ...currentPath, points: newPoints });
    }, [isPaint, currentPath]);

    // 그리기 종료
    const handleMouseUp = useCallback(() => {
        if (!isPaint || !currentPath) return;

        setIsPaint(false);

        // 최소 2개 점이 있을 때만 경로 추가
        if (currentPath.points.length >= 4) {
            const newPaths = [...paths, currentPath];
            setPaths(newPaths);
            if (onPathsChange) {
                onPathsChange(newPaths);
            }
        }

        setCurrentPath(null);
    }, [isPaint, currentPath, paths, onPathsChange]);

    // Stage에 이벤트 리스너 추가
    useEffect(() => {
        if (!stage) return;

        stage.on('mousedown touchstart', handleMouseDown);
        stage.on('mousemove touchmove', handleMouseMove);
        stage.on('mouseup touchend', handleMouseUp);

        return () => {
            stage.off('mousedown touchstart', handleMouseDown);
            stage.off('mousemove touchmove', handleMouseMove);
            stage.off('mouseup touchend', handleMouseUp);
        };
    }, [stage, handleMouseDown, handleMouseMove, handleMouseUp]);

    // 경로를 Line 컴포넌트로 렌더링
    const renderPath = useCallback((path: any) => {
        return (
            <Line
                key={path.id}
                points={path.points}
                stroke={path.color}
                strokeWidth={path.width}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                    path.tool === 'brush' ? 'source-over' : 'destination-out'
                }
            />
        );
    }, []);

    // Stage 없이 Layer 내용만 반환
    return (
        <>
            {/* 완성된 경로들 */}
            {paths.map(renderPath)}

            {/* 현재 그리고 있는 경로 */}
            {currentPath && (
                <Line
                    points={currentPath.points}
                    stroke={currentPath.color}
                    strokeWidth={currentPath.width}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                        currentPath.tool === 'brush' ? 'source-over' : 'destination-out'
                    }
                />
            )}
        </>
    );
};

export default FreeDrawingCanvas;
