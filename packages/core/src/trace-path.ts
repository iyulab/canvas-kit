import type { Path } from './types';

/** The subset of a 2D context `tracePath` draws with — a `CanvasRenderingContext2D`, or a Konva
 * `Context` inside a custom shape's `sceneFunc`. */
export interface PathContext {
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    closePath(): void;
}

/**
 * Builds a path object's outline on `ctx`, in the path's own coordinates (its `points` are relative
 * to its `x`/`y`; the caller translates). Straight segments, or — when `tension` is above 0 — a
 * smooth curve through the midpoints of the segments. Closes the outline when `closed` is set.
 * Fewer than two points build nothing. Every renderer draws paths through this one function, so a
 * path looks the same wherever it is drawn; filling and stroking are left to the caller.
 */
export function tracePath(ctx: PathContext, path: Pick<Path, 'points' | 'tension' | 'closed'>): void {
    const { points } = path;
    if (points.length < 4) return;

    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);

    if (path.tension && path.tension > 0) {
        for (let i = 2; i < points.length - 2; i += 2) {
            const xc = (points[i] + points[i + 2]) / 2;
            const yc = (points[i + 1] + points[i + 3]) / 2;
            ctx.quadraticCurveTo(points[i], points[i + 1], xc, yc);
        }
        const lastIndex = points.length - 2;
        ctx.quadraticCurveTo(points[lastIndex - 2], points[lastIndex - 1], points[lastIndex], points[lastIndex + 1]);
    } else {
        for (let i = 2; i < points.length; i += 2) {
            ctx.lineTo(points[i], points[i + 1]);
        }
    }

    if (path.closed) {
        ctx.closePath();
    }
}
