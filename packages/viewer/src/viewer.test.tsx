import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Viewer } from './viewer';
import type { ViewerHandle } from './viewer';
import { CanvasKitRenderer, Scene } from '@canvas-kit/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock the CanvasKitRenderer
const mockRender = vi.fn();
const mockClear = vi.fn();

// 렌더러·Scene만 가짜로 — 좌표 변환 같은 순수 함수는 실제 구현을 그대로 쓴다.
vi.mock('@canvas-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@canvas-kit/core')>();
  const MockCanvasKitRenderer = vi.fn(function (this: Record<string, unknown>) {
    this.render = mockRender;
    this.clear = mockClear;
  });

  const MockScene = vi.fn(function (this: Record<string, unknown>) {
    this.add = vi.fn();
    this.remove = vi.fn();
    this.getObjects = vi.fn(() => []);
    this.clear = vi.fn();
  });

  return {
    ...actual,
    CanvasKitRenderer: MockCanvasKitRenderer,
    Scene: MockScene,
    IDENTITY_TRANSFORM: { x: 0, y: 0, scale: 1 },
  };
});

describe('Viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a canvas element', () => {
    render(<Viewer width={100} height={100} />);
    const canvasElement = screen.getByTestId('canvas');
    expect(canvasElement).toBeInTheDocument();
    expect(canvasElement).toHaveAttribute('width', '100');
    expect(canvasElement).toHaveAttribute('height', '100');
  });

  it('creates renderer and calls render when scene is provided', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    expect(CanvasKitRenderer).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('does not create renderer when scene is not provided', () => {
    render(<Viewer width={100} height={100} />);

    expect(CanvasKitRenderer).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('passes an onImageLoad callback that re-renders the scene when invoked', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    const options = (CanvasKitRenderer as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(typeof options.onImageLoad).toBe('function');

    mockRender.mockClear();
    options.onImageLoad();

    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('renders scene with the identity transform by default', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('passes a given transform through to the renderer', () => {
    const scene = new Scene();
    const transform = { x: 10, y: 20, scale: 2 };
    render(<Viewer width={100} height={100} scene={scene} transform={transform} />);

    expect(mockRender).toHaveBeenCalledWith(scene, transform);
  });

  it('renders no overlays by default', () => {
    render(<Viewer width={100} height={100} />);
    const overlayLayer = screen.getByTestId('overlay-layer');
    expect(overlayLayer.children.length).toBe(0);
  });

  it('renders overlay content positioned at its scene coordinates', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[
          { id: 'w1', x: 30, y: 40, width: 60, height: 20, content: <span>widget-1</span> },
        ]}
      />
    );

    const overlay = screen.getByTestId('overlay-w1');
    expect(overlay).toHaveTextContent('widget-1');
    expect(overlay.style.left).toBe('30px');
    expect(overlay.style.top).toBe('40px');
    expect(overlay.style.width).toBe('60px');
    expect(overlay.style.height).toBe('20px');
  });

  it('renders multiple overlays independently, keyed by id', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[
          { id: 'a', x: 0, y: 0, width: 10, height: 10, content: <span>A</span> },
          { id: 'b', x: 10, y: 10, width: 10, height: 10, content: <span>B</span> },
        ]}
      />
    );

    expect(screen.getByTestId('overlay-a')).toHaveTextContent('A');
    expect(screen.getByTestId('overlay-b')).toHaveTextContent('B');
  });

  it('applies the view transform to the overlay layer so DOM content pans/zooms with the canvas', () => {
    render(
      <Viewer width={100} height={100} transform={{ x: 15, y: 25, scale: 2 }} overlays={[]} />
    );

    const overlayLayer = screen.getByTestId('overlay-layer');
    expect(overlayLayer.style.transform).toBe('translate(15px, 25px) scale(2)');
    expect(overlayLayer.style.transformOrigin).toBe('0 0');
  });

  it('keeps the overlay layer non-interactive but individual overlays interactive', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[{ id: 'w1', x: 0, y: 0, width: 10, height: 10, content: <span>w</span> }]}
      />
    );

    expect(screen.getByTestId('overlay-layer').style.pointerEvents).toBe('none');
    expect(screen.getByTestId('overlay-w1').style.pointerEvents).toBe('auto');
  });

  describe('pan/zoom interaction (uncontrolled)', () => {
    it('zooms in on wheel with a negative deltaY, anchored at the pointer', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      fireEvent.wheel(container, { deltaY: -100, clientX: 50, clientY: 50 });

      const [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeGreaterThan(1);
    });

    it('zooms out on wheel with a positive deltaY', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      fireEvent.wheel(container, { deltaY: 100, clientX: 50, clientY: 50 });

      const [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeLessThan(1);
    });

    it('keeps the page from scrolling while the wheel zooms', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      // fireEvent returns false when the event's default was prevented.
      expect(fireEvent.wheel(screen.getByTestId('viewer-container'), { deltaY: -100, clientX: 50, clientY: 50 })).toBe(false);
    });

    it('with wheel "modified", lets an unmodified wheel scroll the page, saying how to zoom, and zooms with Ctrl or ⌘', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} wheel="modified" wheelHint="Hold Ctrl to zoom" />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      expect(fireEvent.wheel(container, { deltaY: -100, clientX: 50, clientY: 50 })).toBe(true);
      expect(mockRender).not.toHaveBeenCalled();
      expect(screen.getByTestId('viewer-wheel-hint').textContent).toBe('Hold Ctrl to zoom');

      expect(fireEvent.wheel(container, { deltaY: -100, clientX: 50, clientY: 50, ctrlKey: true })).toBe(false);
      expect(mockRender.mock.calls[mockRender.mock.calls.length - 1][1].scale).toBeGreaterThan(1);
      expect(screen.queryByTestId('viewer-wheel-hint')).toBeNull();
      fireEvent.wheel(container, { deltaY: 100, clientX: 50, clientY: 50, metaKey: true });
      expect(mockRender.mock.calls[mockRender.mock.calls.length - 1][1].scale).toBeLessThan(1.2);
    });

    it('clamps zoom to [minScale, maxScale]', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} minScale={0.5} maxScale={2} />);
      const container = screen.getByTestId('viewer-container');

      for (let i = 0; i < 50; i++) {
        fireEvent.wheel(container, { deltaY: -1000, clientX: 50, clientY: 50 });
      }
      let [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeLessThanOrEqual(2);

      for (let i = 0; i < 50; i++) {
        fireEvent.wheel(container, { deltaY: 1000, clientX: 50, clientY: 50 });
      }
      [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeGreaterThanOrEqual(0.5);
    });

    it('pans by the pointer drag delta without changing scale', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      mockRender.mockClear();
      fireEvent.pointerMove(container, { clientX: 130, clientY: 115, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 130, clientY: 115, pointerId: 1 });

      const [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform).toEqual({ x: 30, y: 15, scale: 1 });
    });

    it('does not pan while the pointer is not down', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      fireEvent.pointerMove(container, { clientX: 130, clientY: 115, pointerId: 1 });

      expect(mockRender).not.toHaveBeenCalled();
    });
  });

  describe('pan/zoom interaction (controlled)', () => {
    it('reports the computed transform via onTransformChange instead of self-updating', () => {
      const onTransformChange = vi.fn();
      const scene = new Scene();
      const { rerender } = render(
        <Viewer
          width={200}
          height={200}
          scene={scene}
          transform={{ x: 0, y: 0, scale: 1 }}
          onTransformChange={onTransformChange}
        />
      );
      const container = screen.getByTestId('viewer-container');

      fireEvent.wheel(container, { deltaY: -100, clientX: 50, clientY: 50 });

      expect(onTransformChange).toHaveBeenCalledTimes(1);
      const reported = onTransformChange.mock.calls[0][0];
      expect(reported.scale).toBeGreaterThan(1);

      // controlled: until the parent feeds the new value back in, the rendered transform
      // stays exactly what was passed in as a prop.
      const [, transformUsed] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transformUsed).toEqual({ x: 0, y: 0, scale: 1 });

      // once the parent re-renders with the reported transform, the viewer reflects it.
      mockRender.mockClear();
      rerender(
        <Viewer
          width={200}
          height={200}
          scene={scene}
          transform={reported}
          onTransformChange={onTransformChange}
        />
      );
      const [, transformAfterRerender] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transformAfterRerender).toEqual(reported);
    });
  });
  describe('text selection', () => {
    it('keeps text on the pannable surface from being selected', () => {
      render(<Viewer width={200} height={200} />);
      expect(screen.getByTestId('viewer-container').style.userSelect).toBe('none');
    });

    it('lets the host give text selection back through style', () => {
      render(<Viewer width={200} height={200} style={{ userSelect: 'text' }} />);
      expect(screen.getByTestId('viewer-container').style.userSelect).toBe('text');
    });

    it('drops a selection begun before the drag became a pan', () => {
      const removeAllRanges = vi.fn();
      const spy = vi.spyOn(window, 'getSelection').mockReturnValue({ removeAllRanges } as unknown as Selection);
      render(<Viewer width={200} height={200} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 102, clientY: 101, pointerId: 1 });
      expect(removeAllRanges).not.toHaveBeenCalled();
      fireEvent.pointerMove(container, { clientX: 140, clientY: 100, pointerId: 1 });
      expect(removeAllRanges).toHaveBeenCalledTimes(1);
      fireEvent.pointerMove(container, { clientX: 150, clientY: 100, pointerId: 1 });
      expect(removeAllRanges).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  describe('tap (press and release without dragging)', () => {
    // jsdom의 getBoundingClientRect는 (0,0)에 놓이므로 client 좌표 = 뷰 좌표.
    it('reports the tapped point in scene coordinates under the current transform', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} transform={{ x: 10, y: 20, scale: 2 }} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 50, clientY: 60, pointerId: 1, button: 0 });
      fireEvent.pointerUp(container, { clientX: 50, clientY: 60, pointerId: 1, button: 0 });

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onTap.mock.calls[0][0]).toMatchObject({
        scene: { x: 20, y: 20 },
        client: { x: 50, y: 60 },
        button: 0,
      });
    });

    it('carries modifier keys and pointer type', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 5, clientY: 5, pointerId: 1, shiftKey: true, pointerType: 'pen' });
      fireEvent.pointerUp(container, { clientX: 5, clientY: 5, pointerId: 1, shiftKey: true, pointerType: 'pen' });

      expect(onTap.mock.calls[0][0]).toMatchObject({ shiftKey: true, altKey: false, pointerType: 'pen' });
    });

    it('treats jitter within the threshold as a tap and does not pan', () => {
      const onTap = vi.fn();
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 102, clientY: 101, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 102, clientY: 101, pointerId: 1 });

      expect(onTransformChange).not.toHaveBeenCalled();
      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('pans instead of tapping once the pointer moves past the threshold', () => {
      const onTap = vi.fn();
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 110, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 100, clientY: 100, pointerId: 1 });

      expect(onTap).not.toHaveBeenCalled();
      // the pan follows the full pointer delta once started — no lag by the threshold distance
      expect(onTransformChange.mock.calls[0][0]).toEqual({ x: 10, y: 0, scale: 1 });
    });

    it('honors a custom tapThreshold', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} tapThreshold={20} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 110, clientY: 110, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 110, clientY: 110, pointerId: 1 });

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('leaves taps on overlay items to the items themselves', () => {
      const onTap = vi.fn();
      render(
        <Viewer
          width={200}
          height={200}
          onTap={onTap}
          overlays={[{ id: 'w1', x: 0, y: 0, width: 50, height: 50, content: <button>widget</button> }]}
        />
      );

      const button = screen.getByText('widget');
      fireEvent.pointerDown(button, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerUp(button, { clientX: 10, clientY: 10, pointerId: 1 });

      expect(onTap).not.toHaveBeenCalled();
    });

    it("reports taps on a display-only overlay (interactive: false) as the viewer's own, and lets the pointer through it", () => {
      const onTap = vi.fn();
      render(
        <Viewer
          width={200}
          height={200}
          onTap={onTap}
          overlays={[
            { id: 'drawing', x: 0, y: 0, width: 200, height: 200, interactive: false, content: <svg data-testid="drawing-svg" /> },
          ]}
        />
      );

      expect(screen.getByTestId('overlay-drawing').style.pointerEvents).toBe('none');
      const drawing = screen.getByTestId('drawing-svg');
      fireEvent.pointerDown(drawing, { clientX: 30, clientY: 40, pointerId: 1 });
      fireEvent.pointerUp(drawing, { clientX: 30, clientY: 40, pointerId: 1 });

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onTap.mock.calls[0][0]).toMatchObject({ scene: { x: 30, y: 40 } });
    });

    // 누르는 순간 캡처하면 브라우저가 click 대상을 컨테이너로 바꿔 오버레이 아이템의 click이 죽는다 —
    // 캡처는 팬이 실제로 시작될 때만.
    it('captures the pointer only once a pan starts, so presses on overlay items still click', () => {
      render(<Viewer width={200} height={200} />);
      const container = screen.getByTestId('viewer-container');
      const setPointerCapture = vi.fn();
      (container as unknown as { setPointerCapture: typeof setPointerCapture }).setPointerCapture = setPointerCapture;

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 7 });
      fireEvent.pointerMove(container, { clientX: 102, clientY: 100, pointerId: 7 });
      expect(setPointerCapture).not.toHaveBeenCalled();

      fireEvent.pointerMove(container, { clientX: 120, clientY: 100, pointerId: 7 });
      expect(setPointerCapture).toHaveBeenCalledTimes(1);
      expect(setPointerCapture).toHaveBeenCalledWith(7);
    });

    it('does not report a tap when the pointer is cancelled', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerCancel(container, { clientX: 10, clientY: 10, pointerId: 1 });

      expect(onTap).not.toHaveBeenCalled();
    });
  });

  describe('sizing', () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    const originalResizeObserver = globalThis.ResizeObserver;

    beforeEach(() => {
      resizeCallback = undefined;
      globalThis.ResizeObserver = class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalResizeObserver;
    });

    function resizeTo(width: number, height: number) {
      act(() => {
        resizeCallback?.(
          [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
          {} as ResizeObserver
        );
      });
    }

    it('fills its container when width and height are omitted', () => {
      render(<Viewer scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');
      expect(container.style.width).toBe('100%');
      expect(container.style.height).toBe('100%');

      resizeTo(320, 180);

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('width', '320');
      expect(canvas).toHaveAttribute('height', '180');
    });

    it('keeps the transform across container resizes', () => {
      const scene = new Scene();
      render(<Viewer scene={scene} transform={{ x: 5, y: 6, scale: 3 }} />);

      resizeTo(320, 180);
      mockRender.mockClear();
      resizeTo(640, 360);

      expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 5, y: 6, scale: 3 });
    });

    it('defers a fitToRect requested before the container is measured until it is', () => {
      const ref = createRef<ViewerHandle>();
      const onTransformChange = vi.fn();
      render(<Viewer ref={ref} onTransformChange={onTransformChange} />);

      // jsdom lays nothing out, so the viewport is still 0×0 here — a fit now has nothing to fit into.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));
      expect(onTransformChange).not.toHaveBeenCalled();

      resizeTo(400, 200);
      expect(onTransformChange).toHaveBeenCalledTimes(1);
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 100, y: 0, scale: 2 });

      // Applied once — later resizes keep the transform as-is.
      resizeTo(800, 400);
      expect(onTransformChange).toHaveBeenCalledTimes(1);
    });

    it('fits correctly when asked from a parent mount effect, before the measured size has rendered', () => {
      const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
      const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 200 });
      try {
        const onTransformChange = vi.fn();
        function Parent() {
          const ref = React.useRef<ViewerHandle>(null);
          React.useEffect(() => {
            ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 });
          }, []);
          return <Viewer ref={ref} onTransformChange={onTransformChange} />;
        }
        render(<Parent />);

        expect(onTransformChange).toHaveBeenCalledTimes(1);
        expect(onTransformChange).toHaveBeenLastCalledWith({ x: 100, y: 0, scale: 2 });
      } finally {
        // clientWidth/clientHeight normally live on Element.prototype, so there is usually no own
        // descriptor to put back — removing the override is what restores them.
        if (widthDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
        else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
        if (heightDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
        else delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
      }
    });

    it('measures its container again, in the same turn, when the print media starts and ends', () => {
      // A page is taken for printing before a ResizeObserver callback (here: never called) or a render scheduled from it has run.
      const printListeners = new Set<() => void>();
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false, media: query,
        addEventListener: (_: string, listener: () => void) => { if (query === 'print') printListeners.add(listener); },
        removeEventListener: (_: string, listener: () => void) => { printListeners.delete(listener); },
      }));
      let size = { width: 700, height: 300 };
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => size.width });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => size.height });
      try {
        const onViewportResize = vi.fn();
        const { unmount } = render(<Viewer scene={new Scene()} onViewportResize={onViewportResize} />);
        expect(onViewportResize).toHaveBeenLastCalledWith({ width: 700, height: 300 });
        expect(printListeners.size).toBe(1);

        size = { width: 793, height: 1122 }; // the paper's size
        printListeners.forEach(listener => listener());
        expect(screen.getByTestId('canvas')).toHaveAttribute('width', '793');
        expect(onViewportResize).toHaveBeenLastCalledWith({ width: 793, height: 1122 });

        size = { width: 700, height: 300 }; // back on the screen
        printListeners.forEach(listener => listener());
        expect(onViewportResize).toHaveBeenLastCalledWith({ width: 700, height: 300 });

        unmount();
        expect(printListeners.size).toBe(0);
      } finally {
        vi.unstubAllGlobals();
        delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
        delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
      }
    });

    it('reports the viewport size once measured and on every resize', () => {
      const onViewportResize = vi.fn();
      render(<Viewer scene={new Scene()} onViewportResize={onViewportResize} />);
      expect(onViewportResize).not.toHaveBeenCalled(); // jsdom measures 0×0 — no viewport yet

      resizeTo(320, 180);
      expect(onViewportResize).toHaveBeenLastCalledWith({ width: 320, height: 180 });
      resizeTo(640, 360);
      expect(onViewportResize).toHaveBeenLastCalledWith({ width: 640, height: 360 });
      expect(onViewportResize).toHaveBeenCalledTimes(2);
    });

    it('reports an explicit viewport size too', () => {
      const onViewportResize = vi.fn();
      render(<Viewer width={100} height={80} onViewportResize={onViewportResize} />);
      expect(onViewportResize).toHaveBeenCalledTimes(1);
      expect(onViewportResize).toHaveBeenLastCalledWith({ width: 100, height: 80 });
    });

    it('uses explicit width/height as-is and does not follow the container', () => {
      render(<Viewer width={100} height={80} />);
      resizeTo(999, 999);

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('width', '100');
      expect(canvas).toHaveAttribute('height', '80');
    });
  });

  describe('device pixel ratio', () => {
    const originalRatio = window.devicePixelRatio;

    afterEach(() => {
      Object.defineProperty(window, 'devicePixelRatio', { value: originalRatio, configurable: true });
    });

    it('sizes the canvas backing store by devicePixelRatio and scales rendering to match', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      const scene = new Scene();
      render(<Viewer width={100} height={50} scene={scene} transform={{ x: 10, y: 5, scale: 1.5 }} />);

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('width', '200');
      expect(canvas).toHaveAttribute('height', '100');
      expect(canvas.style.width).toBe('100px');
      expect(canvas.style.height).toBe('50px');
      expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 20, y: 10, scale: 3 });
    });

    it('keeps overlays in CSS px, unaffected by the pixel ratio', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      render(<Viewer width={100} height={50} transform={{ x: 10, y: 5, scale: 1.5 }} />);

      expect(screen.getByTestId('overlay-layer').style.transform).toBe('translate(10px, 5px) scale(1.5)');
    });
  });

  describe('fitToRect (imperative handle)', () => {
    it('reports the transform that fits a scene rect, honoring padding and the scale bounds', () => {
      const ref = createRef<ViewerHandle>();
      const onTransformChange = vi.fn();
      render(
        <Viewer ref={ref} width={200} height={100} maxScale={4} onTransformChange={onTransformChange} />
      );

      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 50, y: 0, scale: 1 });

      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 1, height: 1 }, { padding: 10 }));
      expect(onTransformChange.mock.calls[1][0].scale).toBe(4);
    });

    it("caps the fitted scale per call with options.maxScale, inside the viewer's own bounds", () => {
      const ref = createRef<ViewerHandle>();
      const onTransformChange = vi.fn();
      render(<Viewer ref={ref} width={400} height={200} maxScale={4} onTransformChange={onTransformChange} />);

      // A small rect would fit at 2× — capped at 1 it stays at natural size, centered.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }, { maxScale: 1 }));
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 150, y: 50, scale: 1 });

      // A large rect still shrinks to fit — the cap only bounds magnification.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 800, height: 400 }, { maxScale: 1 }));
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 0, y: 0, scale: 0.5 });

      // A cap above the viewer's own maxScale cannot lift it.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 10, height: 10 }, { maxScale: 100 }));
      expect(onTransformChange.mock.lastCall![0].scale).toBe(4);
    });

    it('updates the rendered transform in uncontrolled mode', () => {
      const ref = createRef<ViewerHandle>();
      const scene = new Scene();
      render(<Viewer ref={ref} width={200} height={100} scene={scene} />);

      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));

      expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 50, y: 0, scale: 1 });
    });
  });

  describe('keyboard', () => {
    it('is focusable and named, and announces its keys', () => {
      render(<Viewer width={200} height={100} ariaLabel="Floor plan" />);
      const container = screen.getByTestId('viewer-container');
      expect(container).toHaveAttribute('tabindex', '0');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Floor plan');
      expect(container.getAttribute('aria-keyshortcuts')).toContain('ArrowLeft');
      expect(container.getAttribute('aria-keyshortcuts')!.split(' ')).toEqual(expect.arrayContaining(['Plus', '=', '-']));
    });

    it('pans with the arrow keys — the view moves toward the arrow — and further with Shift', () => {
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={100} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: 'ArrowRight' });
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: -40, y: 0, scale: 1 });
      fireEvent.keyDown(container, { key: 'ArrowDown', shiftKey: true });
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: -40, y: -160, scale: 1 });
      fireEvent.keyDown(container, { key: 'ArrowLeft' });
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 0, y: -120, scale: 1 });
    });

    it('zooms around the middle with + and -, within minScale/maxScale', () => {
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={100} maxScale={1.5} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: '+' });
      expect(onTransformChange.mock.lastCall![0].scale).toBeCloseTo(1.25);
      // the middle (100, 50) stays put
      const t = onTransformChange.mock.lastCall![0];
      expect(100 * t.scale + t.x).toBeCloseTo(100 * 1.25 - 25);
      fireEvent.keyDown(container, { key: '=' });
      expect(onTransformChange.mock.lastCall![0].scale).toBe(1.5);
      fireEvent.keyDown(container, { key: '-' });
      expect(onTransformChange.mock.lastCall![0].scale).toBeCloseTo(1.2);
    });

    it('keeps the page from scrolling for a key it handles, and leaves other keys alone', () => {
      render(<Viewer width={200} height={100} />);
      const container = screen.getByTestId('viewer-container');
      expect(fireEvent.keyDown(container, { key: 'ArrowDown' })).toBe(false); // default prevented
      expect(fireEvent.keyDown(container, { key: 'a' })).toBe(true);
    });

    it('ignores keys typed inside an overlay item', () => {
      const onTransformChange = vi.fn();
      render(
        <Viewer
          width={200}
          height={100}
          onTransformChange={onTransformChange}
          overlays={[{ id: 'w', x: 0, y: 0, width: 50, height: 20, content: <input aria-label="field" /> }]}
        />
      );
      fireEvent.keyDown(screen.getByLabelText('field'), { key: 'ArrowRight' });
      expect(onTransformChange).not.toHaveBeenCalled();
    });
  });

  describe('tap from the keyboard', () => {
    // jsdom's getBoundingClientRect sits at (0, 0), so client = view coordinates; the middle of 200 x 100 is (100, 50).
    it.each([
      ['Enter', 'Enter'],
      ['Space', ' '],
    ])('%s taps the point at the middle of the viewport', (_name, key) => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={100} transform={{ x: 10, y: 20, scale: 2 }} onTap={onTap} />);
      fireEvent.keyDown(screen.getByTestId('viewer-container'), { key });

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onTap.mock.calls[0][0]).toEqual({
        scene: { x: 45, y: 15 },
        client: { x: 100, y: 50 },
        button: 0,
        pointerType: 'keyboard',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      });
    });

    it('taps the point the arrow keys brought under the middle', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={100} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: 'ArrowRight' }); // the scene moves 40 px left
      fireEvent.keyDown(container, { key: 'Enter' });
      expect(onTap.mock.lastCall![0].scene).toEqual({ x: 140, y: 50 });
    });

    it('carries Shift on both keys, and Ctrl or ⌘ on Enter, as a click would', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={100} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: 'Enter', shiftKey: true });
      expect(onTap.mock.lastCall![0]).toMatchObject({ shiftKey: true, ctrlKey: false });
      fireEvent.keyDown(container, { key: 'Enter', ctrlKey: true });
      expect(onTap.mock.lastCall![0]).toMatchObject({ ctrlKey: true, metaKey: false });
      fireEvent.keyDown(container, { key: 'Enter', metaKey: true });
      expect(onTap.mock.lastCall![0]).toMatchObject({ metaKey: true });
      fireEvent.keyDown(container, { key: ' ', shiftKey: true });
      expect(onTap.mock.lastCall![0]).toMatchObject({ shiftKey: true });
      expect(onTap).toHaveBeenCalledTimes(4);
    });

    it('leaves Alt+Enter and Ctrl/⌘+Space to the browser and the system', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={100} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      expect(fireEvent.keyDown(container, { key: 'Enter', altKey: true })).toBe(true);
      expect(fireEvent.keyDown(container, { key: ' ', ctrlKey: true })).toBe(true);
      expect(fireEvent.keyDown(container, { key: ' ', metaKey: true })).toBe(true);
      expect(onTap).not.toHaveBeenCalled();
    });

    it('taps once per press — a held key does not repeat', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={100} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: 'Enter' });
      fireEvent.keyDown(container, { key: 'Enter', repeat: true });
      fireEvent.keyDown(container, { key: 'Enter', repeat: true });
      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('keeps the page from scrolling for the Space it handles', () => {
      render(<Viewer width={200} height={100} onTap={vi.fn()} />);
      expect(fireEvent.keyDown(screen.getByTestId('viewer-container'), { key: ' ' })).toBe(false);
    });

    it('does nothing without onTap — Space still scrolls the page, and the keys are not announced', () => {
      render(<Viewer width={200} height={100} />);
      const container = screen.getByTestId('viewer-container');

      expect(fireEvent.keyDown(container, { key: ' ' })).toBe(true);
      expect(fireEvent.keyDown(container, { key: 'Enter' })).toBe(true);
      expect(container.getAttribute('aria-keyshortcuts')!.split(' ')).not.toEqual(expect.arrayContaining(['Enter']));
      expect(container.getAttribute('aria-keyshortcuts')!.split(' ')).not.toEqual(expect.arrayContaining(['Space']));
    });

    it('announces Enter and Space when there is an onTap to receive them', () => {
      render(<Viewer width={200} height={100} onTap={vi.fn()} />);
      const keys = screen.getByTestId('viewer-container').getAttribute('aria-keyshortcuts')!.split(' ');
      expect(keys).toEqual(expect.arrayContaining(['Enter', 'Space', 'ArrowLeft', 'Plus']));
    });

    it('ignores Enter typed inside an overlay item', () => {
      const onTap = vi.fn();
      render(
        <Viewer
          width={200}
          height={100}
          onTap={onTap}
          overlays={[{ id: 'w', x: 0, y: 0, width: 50, height: 20, content: <button>go</button> }]}
        />
      );
      fireEvent.keyDown(screen.getByText('go'), { key: 'Enter' });
      expect(onTap).not.toHaveBeenCalled();
    });

    describe('the aim mark', () => {
      it('is not drawn without onTap, nor before the keyboard is used', () => {
        const { unmount } = render(<Viewer width={200} height={100} />);
        fireEvent.keyDown(screen.getByTestId('viewer-container'), { key: 'ArrowRight' });
        expect(screen.queryByTestId('viewer-aim')).not.toBeInTheDocument();
        unmount();

        render(<Viewer width={200} height={100} onTap={vi.fn()} />);
        expect(screen.queryByTestId('viewer-aim')).not.toBeInTheDocument();
      });

      it('shows at the middle once a key it handles is pressed, hidden from assistive technology and the pointer', () => {
        render(<Viewer width={200} height={100} onTap={vi.fn()} />);
        fireEvent.keyDown(screen.getByTestId('viewer-container'), { key: 'ArrowRight' });

        const aim = screen.getByTestId('viewer-aim');
        expect(aim).toHaveAttribute('aria-hidden', 'true');
        expect(aim.style.pointerEvents).toBe('none');
        expect(aim.style.left).toBe('100px');
        expect(aim.style.top).toBe('50px');
      });

      it('goes away when the pointer is used or focus leaves', () => {
        render(<Viewer width={200} height={100} onTap={vi.fn()} />);
        const container = screen.getByTestId('viewer-container');

        fireEvent.keyDown(container, { key: 'Enter' });
        expect(screen.getByTestId('viewer-aim')).toBeInTheDocument();
        fireEvent.pointerDown(container, { clientX: 5, clientY: 5, pointerId: 1 });
        expect(screen.queryByTestId('viewer-aim')).not.toBeInTheDocument();

        fireEvent.keyDown(container, { key: 'Enter' });
        expect(screen.getByTestId('viewer-aim')).toBeInTheDocument();
        fireEvent.blur(container);
        expect(screen.queryByTestId('viewer-aim')).not.toBeInTheDocument();
      });

      it('shows on arrival by keyboard (:focus-visible) and not on arrival by pointer', () => {
        render(<Viewer width={200} height={100} onTap={vi.fn()} />);
        const container = screen.getByTestId('viewer-container');
        const matches = vi.spyOn(container, 'matches');

        matches.mockReturnValue(false);
        fireEvent.focus(container);
        expect(screen.queryByTestId('viewer-aim')).not.toBeInTheDocument();

        matches.mockReturnValue(true);
        fireEvent.focus(container);
        expect(screen.getByTestId('viewer-aim')).toBeInTheDocument();
      });
    });
  });

  describe('chrome', () => {
    it('does not put a border on the canvas itself (it would grow the canvas past its box)', () => {
      render(<Viewer width={100} height={100} />);
      expect(screen.getByTestId('canvas').style.border).toBe('');
    });

    it('draws the border from a CSS custom property with the previous look as fallback', () => {
      render(<Viewer width={100} height={100} />);
      const chrome = screen.getByTestId('viewer-chrome');
      expect(chrome.getAttribute('style')).toContain('var(--ck-viewer-border, 1px solid #ccc)');
      expect(chrome.style.pointerEvents).toBe('none');
      expect(screen.getByTestId('viewer-container').getAttribute('style')).toContain(
        'var(--ck-viewer-background, transparent)'
      );
    });

    it('passes className and style through to the container', () => {
      render(<Viewer width={100} height={100} className="dark-board" style={{ borderRadius: 8 }} />);
      const container = screen.getByTestId('viewer-container');
      expect(container).toHaveClass('dark-board');
      expect(container.style.borderRadius).toBe('8px');
    });
  });

  describe('overlay rendering cost', () => {
    const counted = vi.fn();
    function Counted({ label }: { label: string }) {
      counted(label);
      return <span>{label}</span>;
    }

    it('does not render an overlay item again when only the view moves', () => {
      const overlays = [
        { id: 'a', x: 0, y: 0, width: 10, height: 10, content: <Counted label="a" /> },
        { id: 'b', x: 20, y: 0, width: 10, height: 10, content: <Counted label="b" /> },
      ];
      const { rerender } = render(<Viewer width={100} height={100} overlays={overlays} transform={{ x: 0, y: 0, scale: 1 }} />);
      expect(counted).toHaveBeenCalledTimes(2);

      rerender(<Viewer width={100} height={100} overlays={overlays} transform={{ x: 30, y: 10, scale: 2 }} />);

      expect(screen.getByTestId('overlay-layer').style.transform).toBe('translate(30px, 10px) scale(2)');
      expect(counted).toHaveBeenCalledTimes(2);
    });

    it('renders an item again when the item itself is replaced', () => {
      const a1 = { id: 'a', x: 0, y: 0, width: 10, height: 10, content: <Counted label="a1" /> };
      const a2 = { id: 'a', x: 0, y: 0, width: 10, height: 10, content: <Counted label="a2" /> };
      const { rerender } = render(<Viewer width={100} height={100} overlays={[a1]} />);
      rerender(<Viewer width={100} height={100} overlays={[a2]} />);
      expect(screen.getByTestId('overlay-a')).toHaveTextContent('a2');
    });
  });

  describe('cullOverlays', () => {
    // A scene 1000 wide: items every 100, in a 100 × 100 view with the default half-view margin (50 each side).
    const row = Array.from({ length: 10 }, (_, i) => ({
      id: `i${i}`,
      x: i * 100,
      y: 0,
      width: 10,
      height: 10,
      content: <span>item {i}</span>,
    }));
    const present = () => row.filter(o => screen.queryByTestId(`overlay-${o.id}`)).map(o => o.id);

    it('renders every item unless asked to leave the far ones out', () => {
      render(<Viewer width={100} height={100} overlays={row} />);
      expect(present()).toHaveLength(10);
    });

    it('leaves out the items beyond the view and its margin, and keeps the ones in them', () => {
      render(<Viewer width={100} height={100} overlays={row} cullOverlays />);
      // View x 0..100, margin 50 -> -50..150: i0 (0..10) and i1 (100..110) are in.
      expect(present()).toEqual(['i0', 'i1']);
    });

    it('follows the view: items come in as they near it and go as they leave', () => {
      const { rerender } = render(
        <Viewer width={100} height={100} overlays={row} cullOverlays transform={{ x: 0, y: 0, scale: 1 }} />
      );
      // Panned 420 to the right: view x 420..520, margin -> 370..570: i4 (400..410) and i5 (500..510) are in, i3 and i6 are not.
      rerender(<Viewer width={100} height={100} overlays={row} cullOverlays transform={{ x: -420, y: 0, scale: 1 }} />);
      expect(present()).toEqual(['i4', 'i5']);
    });

    it('measures in scene units, so zooming out brings more items into the view', () => {
      render(<Viewer width={100} height={100} overlays={row} cullOverlays transform={{ x: 0, y: 0, scale: 0.1 }} />);
      // View x 0..1000 at scale 0.1: the margin is 500 more each side — everything.
      expect(present()).toHaveLength(10);
    });

    it('takes the margin as a fraction of the viewport', () => {
      render(<Viewer width={100} height={100} overlays={row} cullOverlays={{ margin: 0 }} />);
      // View x 0..100 and no margin: i0 (0..10) and i1 (100..110, touching the edge).
      expect(present()).toEqual(['i0', 'i1']);
    });

    it('keeps an item with cull: false wherever it is', () => {
      const kept = row.map(o => (o.id === 'i8' ? { ...o, cull: false } : o));
      render(<Viewer width={100} height={100} overlays={kept} cullOverlays />);
      expect(present()).toEqual(['i0', 'i1', 'i8']);
    });

    it('keeps the item that holds the focus when the view moves away from it', () => {
      const withButton = row.map(o => (o.id === 'i0' ? { ...o, content: <button>focus me</button> } : o));
      const { rerender } = render(
        <Viewer width={100} height={100} overlays={withButton} cullOverlays transform={{ x: 0, y: 0, scale: 1 }} />
      );
      act(() => screen.getByText('focus me').focus());
      rerender(<Viewer width={100} height={100} overlays={withButton} cullOverlays transform={{ x: -420, y: 0, scale: 1 }} />);
      expect(present()).toEqual(['i0', 'i4', 'i5']);
      expect(screen.getByText('focus me')).toHaveFocus();

      // Once the focus leaves it, it goes like any other.
      act(() => screen.getByText('focus me').blur());
      expect(present()).toEqual(['i4', 'i5']);
    });

    it('leaves nothing out while the viewport has no size', () => {
      // No width or height: it follows its container, which a test DOM measures as 0.
      render(<Viewer overlays={row} cullOverlays />);
      expect(present()).toHaveLength(10);
    });
  });

  describe('summarizeOverlays', () => {
    type Call = [string, ...unknown[]];
    let calls: Call[];
    let styles: string[];
    let strokes: string[];
    const fakeContext = () => {
      const ctx: Record<string, unknown> = {
        clearRect: (...a: unknown[]) => calls.push(['clearRect', ...a]),
        beginPath: () => calls.push(['beginPath']),
        arc: (...a: unknown[]) => calls.push(['arc', ...a]),
        fill: () => calls.push(['fill']),
        stroke: () => calls.push(['stroke']),
        moveTo: (...a: unknown[]) => calls.push(['moveTo', ...a]),
        lineTo: (...a: unknown[]) => calls.push(['lineTo', ...a]),
        closePath: () => calls.push(['closePath']),
        setLineDash: (...a: unknown[]) => calls.push(['setLineDash', ...a]),
      };
      Object.defineProperty(ctx, 'fillStyle', { set: (v: string) => { styles.push(v); }, get: () => '' });
      Object.defineProperty(ctx, 'strokeStyle', { set: (v: string) => { strokes.push(v); }, get: () => '' });
      return ctx as unknown as CanvasRenderingContext2D;
    };
    let restore: () => void;
    beforeEach(() => {
      calls = [];
      styles = [];
      strokes = [];
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string) {
        return this.dataset.testid === 'summary-canvas' && kind === '2d' ? fakeContext() : null;
      } as typeof original;
      restore = () => {
        HTMLCanvasElement.prototype.getContext = original;
      };
    });
    afterEach(() => restore());

    const summary = { shape: 'dot' as const, color: '#c33' };
    // n points on a line, 10 wide, every 20.
    const points = (n: number, extra: Record<string, unknown> = {}) =>
      Array.from({ length: n }, (_, i) => ({
        id: `p${i}`,
        x: i * 20,
        y: 0,
        width: 10,
        height: 10,
        content: <span>point {i}</span>,
        summary,
        ...extra,
      }));
    const inPage = (n: number) => Array.from({ length: n }, (_, i) => i).filter(i => screen.queryByTestId(`overlay-p${i}`));
    const drawnDots = () => calls.filter(c => c[0] === 'arc').length;

    it('is off unless asked: no summary canvas, every item stays page content', () => {
      render(<Viewer width={400} height={100} overlays={points(11)} />);
      expect(screen.queryByTestId('summary-canvas')).toBeNull();
      expect(inPage(11)).toHaveLength(11);
    });

    it('keeps items as page content while there are no more of them in the view than `above`', () => {
      render(<Viewer width={400} height={100} overlays={points(10)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(10)).toHaveLength(10);
      expect(drawnDots()).toBe(0);
      expect(screen.getByTestId('summary-status')).toBeEmptyDOMElement();
    });

    it('draws the items as points and takes them out of the page once there are more than `above`', () => {
      render(<Viewer width={400} height={100} overlays={points(11)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(11)).toHaveLength(0);
      expect(drawnDots()).toBe(11);
      expect(styles).toContain('#c33');
      expect(screen.getByTestId('summary-status')).toHaveTextContent('11 items are shown as a summary — zoom in to read them');
    });

    it('says it in the words it is given', () => {
      render(
        <Viewer width={400} height={100} overlays={points(11)} summarizeOverlays={{ above: 10 }} summaryLabel={n => `${n} 개를 요약으로 보임`} />
      );
      expect(screen.getByTestId('summary-status')).toHaveTextContent('11 개를 요약으로 보임');
    });

    it('goes back to page content only below 0.8 × `above`, so the edge does not flicker', () => {
      const { rerender } = render(<Viewer width={400} height={100} overlays={points(11)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(11)).toHaveLength(0);
      // 9 and 8 are not above 10, but summarizing stops only below 8 (0.8 × 10).
      rerender(<Viewer width={400} height={100} overlays={points(9)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(9)).toHaveLength(0);
      rerender(<Viewer width={400} height={100} overlays={points(8)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(8)).toHaveLength(0);
      rerender(<Viewer width={400} height={100} overlays={points(7)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(7)).toHaveLength(7);
      // And starts again only above 10.
      rerender(<Viewer width={400} height={100} overlays={points(10)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(10)).toHaveLength(10);
    });

    it('counts the items in the view: zooming in to fewer of them brings the page content back', () => {
      // 11 points 20 apart (0..210): at scale 1 all are in the 400-wide view; at scale 20 the view shows 20 units.
      const { rerender } = render(
        <Viewer width={400} height={100} overlays={points(11)} summarizeOverlays={{ above: 10 }} transform={{ x: 0, y: 0, scale: 1 }} />
      );
      expect(inPage(11)).toHaveLength(0);
      rerender(
        <Viewer width={400} height={100} overlays={points(11)} summarizeOverlays={{ above: 10 }} transform={{ x: 0, y: 0, scale: 20 }} />
      );
      // The view (scene x 0..20) and its half-view margin reach -10..30: only p0 and p1 are near; the count is under 8.
      expect(inPage(11)).toHaveLength(11);
    });

    it('never summarizes an item without a summary or with cull: false', () => {
      const mixed = points(12).map((o, i) => (i === 0 ? { ...o, summary: undefined } : i === 1 ? { ...o, cull: false } : o));
      render(<Viewer width={400} height={100} overlays={mixed} summarizeOverlays={{ above: 9 }} />);
      expect(inPage(12)).toEqual([0, 1]);
    });

    it('keeps the item that holds the focus when the count tips over', () => {
      const withButton = (n: number) => points(n).map((o, i) => (i === 2 ? { ...o, content: <button>focus me</button> } : o));
      const { rerender } = render(<Viewer width={400} height={100} overlays={withButton(9)} summarizeOverlays={{ above: 9 }} />);
      act(() => screen.getByText('focus me').focus());
      rerender(<Viewer width={400} height={100} overlays={withButton(12)} summarizeOverlays={{ above: 9 }} />);
      expect(screen.getByText('focus me')).toHaveFocus();
      expect(inPage(12)).toEqual([2]);
      // Once the focus leaves it, it is summarized like the others.
      act(() => screen.getByText('focus me').blur());
      expect(inPage(12)).toEqual([]);
    });

    it('draws a point at the middle of its box under the view transform', () => {
      const overlays = [{ id: 'p0', x: 100, y: 50, width: 10, height: 10, content: null, summary }, ...points(2).slice(1)];
      render(<Viewer width={400} height={100} overlays={overlays} summarizeOverlays={{ above: 1 }} transform={{ x: 10, y: 20, scale: 2 }} />);
      // centre (105, 55) -> (105 × 2 + 10, 55 × 2 + 20) = (220, 130); 10 × 2 = 20 px across -> radius 10.
      const first = calls.find(c => c[0] === 'arc')!;
      expect(first.slice(1, 4)).toEqual([220, 130, 10]);
    });

    it('never draws a point under 3 px across', () => {
      render(<Viewer width={400} height={100} overlays={points(3)} summarizeOverlays={{ above: 1 }} transform={{ x: 0, y: 0, scale: 0.1 }} />);
      // 10 × 0.1 = 1 px -> kept at 3 px across -> radius 1.5.
      const arcs = calls.filter(c => c[0] === 'arc');
      expect(arcs).toHaveLength(3);
      expect(arcs.every(c => c[3] === 1.5)).toBe(true);
    });

    it('draws a halo, a ring and a pin as such', () => {
      const shapes = [
        { ...points(1)[0]!, id: 'a', summary: { shape: 'dot' as const, color: '#111', halo: true } },
        { ...points(1)[0]!, id: 'b', x: 40, summary: { shape: 'ring' as const, color: '#222' } },
        { ...points(1)[0]!, id: 'c', x: 80, summary: { shape: 'pin' as const, color: '#333' } },
      ];
      render(<Viewer width={400} height={100} overlays={shapes} summarizeOverlays={{ above: 2 }} />);
      // dot + halo: two arcs, a stroke (halo) and a fill; ring: an arc and a stroke; pin: a path with a tip and one arc, filled.
      expect(calls.filter(c => c[0] === 'arc')).toHaveLength(4);
      expect(calls.filter(c => c[0] === 'stroke')).toHaveLength(2);
      expect(calls.filter(c => c[0] === 'fill')).toHaveLength(2);
      expect(calls.filter(c => c[0] === 'moveTo')).toHaveLength(1);
    });

    it('draws an edge — a dashed or dotted ring in its own colour — apart from the point and its halo', () => {
      const edged = [
        { ...points(1)[0]!, id: 'a', summary: { shape: 'dot' as const, color: '#111', edge: { dash: 'dashed' as const, color: '#f59e0b' } } },
        { ...points(1)[0]!, id: 'b', x: 40, summary: { shape: 'dot' as const, color: '#222', edge: { dash: 'dotted' as const, color: '#6b7280' } } },
        { ...points(1)[0]!, id: 'c', x: 80, summary: { shape: 'dot' as const, color: '#333' } },
      ];
      render(<Viewer width={400} height={100} overlays={edged} summarizeOverlays={{ above: 2 }} />);
      // Each edge: a stroked arc under its own dash pattern, then the pattern is put back — so the next point's fill and halo are solid.
      const dashes = calls.filter(c => c[0] === 'setLineDash').map(c => c[1] as number[]);
      expect(dashes.filter(d => d.length > 0)).toHaveLength(2);
      expect(dashes[0]!.length).toBeGreaterThan(0);
      expect(dashes.at(-1)).toEqual([]);
      // A dashed edge and a dotted one are told apart by their pattern, and each is drawn in its own colour.
      const patterns = dashes.filter(d => d.length > 0);
      expect(patterns[0]).not.toEqual(patterns[1]);
      expect(strokes).toContain('#f59e0b');
      expect(strokes).toContain('#6b7280');
      // The point is still filled in its own colour, edge or none.
      expect(styles).toEqual(expect.arrayContaining(['#111', '#222', '#333']));
      expect(calls.filter(c => c[0] === 'fill')).toHaveLength(3);
    });

    it('keeps the edge of a small point clear of it and apart from its halo, so a dash, a dot and a double rule stay three', () => {
      // A point of 6 px (radius 3): a far view of a crowd.
      const small = (dash: 'dashed' | 'dotted' | 'double', extra: Record<string, unknown> = {}) => [
        { ...points(1)[0]!, id: 'a', width: 6, height: 6, summary: { shape: 'dot' as const, color: '#111', edge: { dash, color: '#f59e0b' }, ...extra } },
        { ...points(1)[0]!, id: 'b', x: 40, width: 6, height: 6, summary: { shape: 'dot' as const, color: '#333' } },
      ];
      const radii = (items: ReturnType<typeof small>) => {
        calls = [];
        const { unmount } = render(<Viewer width={400} height={100} overlays={items} summarizeOverlays={{ above: 1 }} />);
        const arcs = calls.filter(c => c[0] === 'arc').map(c => c[3] as number);
        unmount();
        return arcs;
      };
      for (const dash of ['dashed', 'dotted'] as const) {
        const [ring, point] = radii(small(dash));
        expect(point, dash).toBe(3);
        expect(ring! - point!, dash).toBeGreaterThanOrEqual(2); // air between the point and its ring
      }
      const [inner, outer] = radii(small('double'));
      expect(inner! - 3).toBeGreaterThanOrEqual(2);
      expect(outer! - inner!).toBeGreaterThanOrEqual(2.5); // the two rules are apart
      // With a halo too, the halo is the further ring — not on top of the edge.
      const [edge, halo] = radii(small('dashed', { halo: true }));
      expect(halo! - edge!).toBeGreaterThan(1.5);
    });

    it('draws a double edge as two solid rings — not dashed, not dotted — in its own colour', () => {
      const doubled = [{ ...points(1)[0]!, id: 'a', summary: { shape: 'dot' as const, color: '#111', edge: { dash: 'double' as const, color: '#f59e0b' } } }, { ...points(1)[0]!, id: 'b', x: 40, summary: { shape: 'dot' as const, color: '#333' } }];
      render(<Viewer width={400} height={100} overlays={doubled} summarizeOverlays={{ above: 1 }} />);
      // Two edge rings and the two points' fills; no pattern is set for the edge (it stays solid).  Each ring is its own stroked arc in the edge's colour.
      expect(calls.filter(c => c[0] === 'setLineDash')).toHaveLength(0);
      expect(calls.filter(c => c[0] === 'arc')).toHaveLength(4);
      expect(calls.filter(c => c[0] === 'stroke')).toHaveLength(2);
      expect(strokes).toContain('#f59e0b');
    });

    it('takes no pointer: the canvas lets presses through to the viewer', () => {
      render(<Viewer width={400} height={100} overlays={points(11)} summarizeOverlays={{ above: 10 }} />);
      expect(screen.getByTestId('summary-canvas')).toHaveStyle({ pointerEvents: 'none' });
      expect(screen.getByTestId('summary-canvas')).toHaveAttribute('aria-hidden', 'true');
    });

    it('summarizes nothing while the viewport has no size', () => {
      render(<Viewer overlays={points(11)} summarizeOverlays={{ above: 10 }} />);
      expect(inPage(11)).toHaveLength(11);
    });
  });
});

describe('Viewer motion', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let next = 1;
  const flowing = () => {
    const scene = new Scene();
    (scene.getObjects as unknown as ReturnType<typeof vi.fn>).mockReturnValue([{ type: 'line', x: 0, y: 0, points: [0, 0, 10, 0], dash: [6, 4], dashFlow: 10 }]);
    return scene;
  };
  const advance = (now: number) => {
    const due = [...frames.entries()];
    frames.clear();
    for (const [, callback] of due) callback(now);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    frames.clear();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(next, callback); return next++; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('redraws a scene with flowing dashes on a clock, a frame every 50 ms at most', () => {
    const scene = flowing();
    render(<Viewer width={100} height={100} scene={scene} />);
    expect(mockRender).toHaveBeenCalledTimes(1);
    advance(1000);
    expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 0, y: 0, scale: 1 }, 1000);
    advance(1020); // too soon
    expect(mockRender).toHaveBeenCalledTimes(2);
    advance(1060);
    expect(mockRender).toHaveBeenCalledTimes(3);
    expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 0, y: 0, scale: 1 }, 1060);
  });

  it('draws a scene with nothing moving once, and asks for no frames', () => {
    render(<Viewer width={100} height={100} scene={new Scene()} />);
    expect(frames.size).toBe(0);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('keeps the dashes still for a reader who asks for less motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener: () => {}, removeEventListener: () => {} }));
    render(<Viewer width={100} height={100} scene={flowing()} />);
    expect(frames.size).toBe(0);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it('stops its clock when the viewer goes away', () => {
    const { unmount } = render(<Viewer width={100} height={100} scene={flowing()} />);
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });

  it('keeps its place in the motion when an image finishes loading', () => {
    const scene = flowing();
    render(<Viewer width={100} height={100} scene={scene} />);
    advance(2000);
    const options = (CanvasKitRenderer as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    mockRender.mockClear();
    options.onImageLoad();
    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 }, 2000);
  });
});
