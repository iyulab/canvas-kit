import React, { useRef, useEffect } from 'react';
import { CanvasKitRenderer, Scene, IDENTITY_TRANSFORM } from '@canvas-kit/core';
import type { Transform, OverlayItem } from '@canvas-kit/core';

// OverlayItem은 위치/크기만 core에서 정의한다 — 실제로 무엇을 그릴지(content)는
// UI 프레임워크에 의존하므로 여기(viewer)에서 React 노드로 확장한다.
export interface ViewerOverlayItem extends OverlayItem {
  content: React.ReactNode;
}

export type { Transform };

interface ViewerProps {
  width: number;
  height: number;
  scene?: Scene;
  /** 뷰의 pan/zoom 상태. 지정하지 않으면 identity(팬 없음, 배율 1)로 렌더링된다. */
  transform?: Transform;
  /**
   * 씬 좌표에 위치를 가진 DOM 콘텐츠(예: 데이터 바인딩 위젯) 목록. 각 아이템은
   * `transform`에 맞춰 캔버스와 동일한 좌표계로 pan/zoom된다.
   */
  overlays?: ViewerOverlayItem[];
}

export const Viewer: React.FC<ViewerProps> = ({
  width,
  height,
  scene,
  transform = IDENTITY_TRANSFORM,
  overlays = [],
}: ViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && scene) {
      const renderer = new CanvasKitRenderer(canvasRef.current);
      renderer.render(scene, transform);
    }
  }, [scene, width, height, transform]);

  return (
    <div
      data-testid="viewer-container"
      style={{ position: 'relative', width, height, overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        data-testid="canvas"
        style={{ border: '1px solid #ccc', position: 'absolute', top: 0, left: 0 }}
      />
      <div
        data-testid="overlay-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          // 캔버스 렌더러(ctx.translate + ctx.scale)와 동일한 순서로 합성되도록
          // transform-origin을 원점(0,0)에 고정 — canvas와 DOM 오버레이가 항상 같은
          // 화면 좌표에 그려지도록 하는 핵심 불변식.
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      >
        {overlays.map(overlay => (
          <div
            key={overlay.id}
            data-testid={`overlay-${overlay.id}`}
            style={{
              position: 'absolute',
              left: overlay.x,
              top: overlay.y,
              width: overlay.width,
              height: overlay.height,
              pointerEvents: 'auto',
            }}
          >
            {overlay.content}
          </div>
        ))}
      </div>
    </div>
  );
};