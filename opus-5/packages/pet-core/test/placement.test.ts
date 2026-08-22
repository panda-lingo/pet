import { describe, expect, it } from 'vitest';
import { clampToViewport, overlapArea, resolvePlacement, type PlacementRequest, type Rect } from '../src/guide/placement.js';

const viewport = { width: 1280, height: 800 };
const petRectOf = (result: { x: number; y: number }, petSize: number): Rect => ({
  x: result.x,
  y: result.y,
  width: petSize,
  height: petSize,
});
const request = (patch: Partial<PlacementRequest> = {}): PlacementRequest => ({
  target: { x: 600, y: 400, width: 100, height: 40 },
  viewport,
  petSize: 64,
  bubble: { width: 240, height: 100 },
  preferred: 'auto',
  ...patch,
});

describe('overlapArea', () => {
  it('measures intersection and reports zero for disjoint or touching rects', () => {
    expect(overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
    expect(overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(0);
    expect(overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 40, y: 40, width: 10, height: 10 })).toBe(0);
  });
});

describe('resolvePlacement', () => {
  it('prefers the reading-order side and never covers the target', () => {
    const result = resolvePlacement(request());
    expect(result.placement).toBe('right');
    expect(result.clamped).toBe(false);
    expect(overlapArea(petRectOf(result, 64), request().target)).toBe(0);
  });

  it('honours an explicit preferred side when it fits', () => {
    expect(resolvePlacement(request({ preferred: 'below' })).placement).toBe('below');
    expect(resolvePlacement(request({ preferred: 'left' })).placement).toBe('left');
  });

  it('flips to the other side rather than leaving the viewport', () => {
    const target = { x: 1180, y: 100, width: 90, height: 40 };
    const result = resolvePlacement(request({ target, petSize: 148, bubble: { width: 280, height: 120 } }));
    expect(result.placement).toBe('left');
    expect(result.x).toBeGreaterThanOrEqual(16);
    expect(result.x + 148).toBeLessThanOrEqual(viewport.width - 16);
    expect(overlapArea(petRectOf(result, 148), target)).toBe(0);
  });

  it('clamps into the viewport for a target in the far corner and says so', () => {
    const target = { x: 1250, y: 760, width: 30, height: 30 };
    const result = resolvePlacement(request({ target, petSize: 148 }));
    expect(result.clamped).toBe(true);
    expect(result.x).toBeGreaterThanOrEqual(16);
    expect(result.y).toBeGreaterThanOrEqual(16);
    expect(result.x + 148).toBeLessThanOrEqual(viewport.width - 16);
    expect(result.y + 148).toBeLessThanOrEqual(viewport.height - 16);
  });

  it('keeps clear of rects it must avoid, such as the focused field', () => {
    const target = { x: 400, y: 300, width: 120, height: 40 };
    const focused: Rect = { x: 520, y: 280, width: 200, height: 100 };
    const result = resolvePlacement(request({ target, avoid: [focused] }));
    expect(result.placement).toBe('left');
    expect(overlapArea(petRectOf(result, 64), focused)).toBe(0);
    expect(overlapArea(petRectOf(result, 64), target)).toBe(0);
  });

  it('chooses the bubble side that stays on screen', () => {
    const nearRight = resolvePlacement(
      request({ target: { x: 1150, y: 300, width: 100, height: 40 }, bubble: { width: 300, height: 120 } }),
    );
    expect(nearRight.bubbleSide).toBe('left');

    const nearLeft = resolvePlacement(
      request({ target: { x: 20, y: 300, width: 100, height: 40 }, bubble: { width: 300, height: 120 } }),
    );
    expect(nearLeft.bubbleSide).toBe('right');
  });

  it('still returns a usable position on a small phone viewport', () => {
    const small = { width: 360, height: 640 };
    const result = resolvePlacement(
      request({
        viewport: small,
        petSize: 116,
        bubble: { width: 260, height: 140 },
        target: { x: 16, y: 560, width: 328, height: 56 },
        margin: 16,
      }),
    );
    expect(result.x).toBeGreaterThanOrEqual(16);
    expect(result.y).toBeGreaterThanOrEqual(16);
    expect(result.x + 116).toBeLessThanOrEqual(small.width - 16);
    expect(result.y + 116).toBeLessThanOrEqual(small.height - 16);
  });

  it('respects a custom gap and margin', () => {
    const result = resolvePlacement(request({ gap: 40, margin: 48 }));
    expect(result.x).toBe(600 + 100 + 40);
    const cornered = resolvePlacement(request({ target: { x: 0, y: 0, width: 10, height: 10 }, margin: 48 }));
    expect(cornered.x).toBeGreaterThanOrEqual(48);
    expect(cornered.y).toBeGreaterThanOrEqual(48);
  });
});

describe('clampToViewport', () => {
  it('keeps the pet inside the viewport with the brand edge gap', () => {
    expect(clampToViewport(-50, 2_000, 64, viewport)).toEqual({ x: 16, y: 720 });
    expect(clampToViewport(300, 300, 64, viewport)).toEqual({ x: 300, y: 300 });
    expect(clampToViewport(300, 300, 64, viewport, 24)).toEqual({ x: 300, y: 300 });
  });

  it('degrades gracefully when the pet is larger than the viewport', () => {
    expect(clampToViewport(500, 500, 200, { width: 120, height: 120 })).toEqual({ x: 16, y: 16 });
  });
});
