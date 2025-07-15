import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Viewer } from '@canvas-kit/viewer';
import { Scene, SelectionManager, HitTest, type DrawingObject } from '@canvas-kit/core';

/**
 * @deprecated SelectableViewer는 레거시 컴포넌트입니다.
 * 새로운 프로젝트에서는 KonvaDesigner 사용을 권장합니다.
 * 
 * SVGOverlay 제거로 인해 일부 기능이 제한될 수 있습니다.
 */

export interface SelectableViewerProps {
    scene: Scene;
    width?: number;
    height?: number;
    className?: string;
    onSelectionChange?: (selectedObjects: DrawingObject[]) => void;
    enableMultiSelect?: boolean;
}

export const SelectableViewer: React.FC<SelectableViewerProps> = ({
    scene,
    width = 400,
    height = 300,
    className,
    onSelectionChange,
    enableMultiSelect = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectionManager] = useState(() => new SelectionManager());
    const [overlay, setOverlay] = useState<SVGOverlay | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize overlay when container is ready
    useEffect(() => {
        if (containerRef.current && !overlay) {
            const newOverlay = new SVGOverlay(containerRef.current, {
                strokeColor: '#0066cc',
                strokeWidth: 2,
                strokeDasharray: '4,2',
                fillColor: '#0066cc',
                fillOpacity: 0.1
            });

            newOverlay.updateSize(width, height);
            setOverlay(newOverlay);
            setIsInitialized(true);
        }

        return () => {
            if (overlay) {
                overlay.destroy();
            }
        };
    }, [containerRef.current, width, height]);

    // Update overlay size when dimensions change
    useEffect(() => {
        if (overlay) {
            overlay.updateSize(width, height);
        }
    }, [overlay, width, height]);

    // Handle selection changes
    useEffect(() => {
        if (!isInitialized) return;

        const handleSelectionChange = (selectedObjects: DrawingObject[]) => {
            if (overlay && selectedObjects.length > 0) {
                const bounds = selectionManager.getSelectionBounds();
                if (bounds) {
                    overlay.showSelection([bounds]);
                }
            } else if (overlay) {
                overlay.clearSelection();
            }

            onSelectionChange?.(selectedObjects);
        };

        selectionManager.addListener(handleSelectionChange);

        return () => {
            selectionManager.removeListener(handleSelectionChange);
        };
    }, [selectionManager, overlay, onSelectionChange, isInitialized]);

    // Handle mouse clicks for selection
    const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (!isInitialized) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const hitObject = scene.getObjectAtPoint(x, y);

        if (hitObject) {
            if (enableMultiSelect && (event.ctrlKey || event.metaKey)) {
                selectionManager.addToSelection(hitObject);
            } else {
                selectionManager.selectSingle(hitObject);
            }
        } else {
            selectionManager.clearSelection();
        }
    }, [scene, selectionManager, enableMultiSelect, isInitialized]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Escape to clear selection
            if (event.key === 'Escape') {
                selectionManager.clearSelection();
            }

            // Ctrl+A to select all (if multiselect enabled)
            if (enableMultiSelect && (event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault();
                scene.getObjects().forEach(obj => {
                    selectionManager.addToSelection(obj);
                });
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectionManager, scene, enableMultiSelect]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                position: 'relative',
                width,
                height,
                cursor: 'pointer'
            }}
            onClick={handleClick}
        >
            <Viewer
                scene={scene}
                width={width}
                height={height}
            />
        </div>
    );
};

export default SelectableViewer;
