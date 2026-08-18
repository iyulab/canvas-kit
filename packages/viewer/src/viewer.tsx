import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasKitRenderer, Scene, IDENTITY_TRANSFORM } from '@canvas-kit/core';
import type { Transform, OverlayItem } from '@canvas-kit/core';

const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 10;
// wheel deltaY -> zoom factor. Negative deltaY (scroll up) zooms in.
const ZOOM_SENSITIVITY = 0.001;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
  /**
   * 뷰의 pan/zoom 상태를 지정하면 controlled 모드로 동작한다 — Viewer는 자체적으로 이 값을
   * 바꾸지 않고, 상호작용으로 계산된 다음 값을 `onTransformChange`로만 보고한다. 생략하면
   * uncontrolled 모드로 동작해 Viewer가 내부 상태(초기값 identity)를 직접 소유·갱신한다.
   */
  transform?: Transform;
  /** transform이 바뀔 때(휠/드래그 상호작용 결과) 호출된다. controlled/uncontrolled 모두에서 호출됨. */
  onTransformChange?: (transform: Transform) => void;
  /** 휠 줌의 최소/최대 배율. 기본 0.1~10. */
  minScale?: number;
  maxScale?: number;
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
  transform: controlledTransform,
  onTransformChange,
  minScale = DEFAULT_MIN_SCALE,
  maxScale = DEFAULT_MAX_SCALE,
  overlays = [],
}: ViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledTransform !== undefined;
  const [internalTransform, setInternalTransform] = useState<Transform>(
    controlledTransform ?? IDENTITY_TRANSFORM
  );
  const transform = isControlled ? controlledTransform! : internalTransform;

  // 드래그 중 시작 시점의 포인터 위치·transform을 들고 있는 ref (렌더를 유발하지 않아야 함)
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; startTransform: Transform } | null>(null);

  useEffect(() => {
    if (canvasRef.current && scene) {
      const renderer = new CanvasKitRenderer(canvasRef.current);
      renderer.render(scene, transform);
    }
  }, [scene, width, height, transform]);

  const applyTransform = useCallback(
    (next: Transform) => {
      if (!isControlled) {
        setInternalTransform(next);
      }
      onTransformChange?.(next);
    },
    [isControlled, onTransformChange]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const px = e.clientX - (rect?.left ?? 0);
      const py = e.clientY - (rect?.top ?? 0);

      const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
      const newScale = clamp(transform.scale * factor, minScale, maxScale);

      // 포인터 아래의 씬 좌표가 줌 전후로 화면상 같은 위치에 남도록 x/y를 함께 보정
      const scenePointX = (px - transform.x) / transform.scale;
      const scenePointY = (py - transform.y) / transform.scale;

      applyTransform({
        x: px - scenePointX * newScale,
        y: py - scenePointY * newScale,
        scale: newScale,
      });
    },
    [transform, minScale, maxScale, applyTransform]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTransform: transform,
      };
      const target = e.currentTarget as { setPointerCapture?: (id: number) => void };
      target.setPointerCapture?.(e.pointerId);
    },
    [transform]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      applyTransform({
        x: drag.startTransform.x + (e.clientX - drag.startX),
        y: drag.startTransform.y + (e.clientY - drag.startY),
        scale: drag.startTransform.scale,
      });
    },
    [applyTransform]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === e.pointerId) {
      dragStateRef.current = null;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="viewer-container"
      style={{ position: 'relative', width, height, overflow: 'hidden', touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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