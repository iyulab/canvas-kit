import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva';
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
}

export const FreeDrawingCanvas: React.FC<FreeDrawingCanvasProps> = ({
    width,
    height,
    tool,
    onPathsChange
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const layerRef = useRef<Konva.Layer>(null);
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

        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
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

    // 캔버스 클리어
    const clearCanvas = useCallback(() => {
        setPaths([]);
        setCurrentPath(null);
        if (onPathsChange) {
            onPathsChange([]);
        }
    }, [onPathsChange]);

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

    return (
        <div>
            <Stage
                ref={stageRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                <Layer ref={layerRef}>
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
                </Layer>
            </Stage>
        </div>
    );
};

export default FreeDrawingCanvas;
