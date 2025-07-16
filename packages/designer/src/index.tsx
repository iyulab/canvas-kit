import React from 'react';
import { Viewer } from '@canvas-kit/viewer';
import type { Scene } from '@canvas-kit/core';

interface DesignerProps {
  width: number;
  height: number;
  scene: Scene;
}

/**
 * @deprecated 레거시 Designer - Konva 전환 후 제거 예정
 * KonvaDesigner 사용을 권장합니다.
 */
export const Designer: React.FC<DesignerProps> = ({ width, height, scene }) => {
  return (
    <div style={{ position: 'relative', width, height }}>
      <Viewer width={width} height={height} scene={scene} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Initially, the overlay does not capture mouse events
        }}
      >
        {/* Interaction layer for selection, resizing, etc. */}
      </div>
    </div>
  );
};

// 🔥 NEW: Konva 기반 Designer - 메인 컴포넌트
export { KonvaDesigner } from './KonvaDesigner';
export { KonvaDesigner as default } from './KonvaDesigner';

// Selection components
export { SimpleSelectionDemo } from './SimpleSelectionDemo';

// Drawing and editing tools
export { FreeDrawingCanvas } from './FreeDrawingCanvas';
export type { DrawingTool } from './FreeDrawingCanvas';
export { EditableText } from './EditableText';
export { AdvancedDesigner } from './AdvancedDesigner';
export type { DesignerTool } from './AdvancedDesigner';

// Re-export core functionality commonly used with designer
export {
  CommandHistory,
  AddCommand,
  DeleteCommand,
  MoveCommand,
  ResizeCommand,
  CopyCommand,
  CutCommand,
  PasteCommand,
  DuplicateCommand
} from '@canvas-kit/core';
