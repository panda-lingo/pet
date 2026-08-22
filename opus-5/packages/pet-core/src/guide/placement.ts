import type { GuidePlacement } from './types.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementRequest {
  target: Rect;
  viewport: { width: number; height: number };
  /** Square pet box, in CSS pixels. */
  petSize: number;
  bubble: { width: number; height: number };
  preferred: GuidePlacement | 'auto';
  /** Distance kept between the pet box and the target. */
  gap?: number;
  /** Minimum distance to the viewport edges (brand edge gap). */
  margin?: number;
  /** Rects the pet must not cover, e.g. the focused form control. */
  avoid?: readonly Rect[];
}

export interface PlacementResult {
  x: number;
  y: number;
  placement: GuidePlacement;
  bubbleSide: 'left' | 'right';
  /** True when the ideal position had to be pulled back inside the viewport. */
  clamped: boolean;
  score: number;
}

const ORDER: readonly GuidePlacement[] = ['right', 'left', 'below', 'above'];

export function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function idealPosition(placement: GuidePlacement, request: PlacementRequest, gap: number): { x: number; y: number } {
  const { target, petSize } = request;
  const centerX = target.x + target.width / 2 - petSize / 2;
  const centerY = target.y + target.height / 2 - petSize / 2;
  switch (placement) {
    case 'left':
      return { x: target.x - gap - petSize, y: centerY };
    case 'right':
      return { x: target.x + target.width + gap, y: centerY };
    case 'above':
      return { x: centerX, y: target.y - gap - petSize };
    case 'below':
      return { x: centerX, y: target.y + target.height + gap };
  }
}

function chooseBubbleSide(petRect: Rect, request: PlacementRequest, gap: number, margin: number): 'left' | 'right' {
  const { bubble, viewport, target } = request;
  const rightRect: Rect = {
    x: petRect.x + petRect.width + gap,
    y: petRect.y,
    width: bubble.width,
    height: bubble.height,
  };
  const leftRect: Rect = { x: petRect.x - gap - bubble.width, y: petRect.y, width: bubble.width, height: bubble.height };
  const rightFits = rightRect.x + bubble.width <= viewport.width - margin;
  const leftFits = leftRect.x >= margin;
  if (rightFits && !leftFits) return 'right';
  if (leftFits && !rightFits) return 'left';
  // Both (or neither) fit: prefer the side that hides less of the target.
  return overlapArea(rightRect, target) <= overlapArea(leftRect, target) ? 'right' : 'left';
}

/**
 * Scores the four candidate placements and returns the best one.
 *
 * Hard requirements from the brief, expressed as penalties: stay inside the viewport,
 * do not cover the target, do not cover the focused field. Ties fall back to the
 * reading order right → left → below → above.
 */
export function resolvePlacement(request: PlacementRequest): PlacementResult {
  const gap = request.gap ?? 18;
  const margin = request.margin ?? 16;
  const { petSize, viewport } = request;
  const maxX = Math.max(margin, viewport.width - margin - petSize);
  const maxY = Math.max(margin, viewport.height - margin - petSize);

  let best: PlacementResult | null = null;
  for (let index = 0; index < ORDER.length; index += 1) {
    const placement = ORDER[index];
    if (!placement) continue;
    const ideal = idealPosition(placement, request, gap);
    const x = Math.min(Math.max(ideal.x, margin), maxX);
    const y = Math.min(Math.max(ideal.y, margin), maxY);
    const shift = Math.abs(x - ideal.x) + Math.abs(y - ideal.y);
    const petRect: Rect = { x, y, width: petSize, height: petSize };

    let score = shift;
    score += overlapArea(petRect, request.target) * 4;
    for (const rect of request.avoid ?? []) score += overlapArea(petRect, rect) * 4;
    if (request.preferred !== 'auto' && request.preferred !== placement) score += 60;
    score += index * 2;

    const bubbleSide = chooseBubbleSide(petRect, request, gap, margin);
    const bubbleRect: Rect =
      bubbleSide === 'right'
        ? { x: x + petSize + gap, y, width: request.bubble.width, height: request.bubble.height }
        : { x: x - gap - request.bubble.width, y, width: request.bubble.width, height: request.bubble.height };
    const bubbleOverflow =
      Math.max(0, margin - bubbleRect.x) + Math.max(0, bubbleRect.x + bubbleRect.width - (viewport.width - margin));
    score += bubbleOverflow * 1.5;
    score += overlapArea(bubbleRect, request.target) * 2;

    const candidate: PlacementResult = { x, y, placement, bubbleSide, clamped: shift > 0.5, score };
    if (best === null || candidate.score < best.score) best = candidate;
  }

  if (best === null) throw new Error('resolvePlacement: no candidate placements');
  return best;
}

/** Keeps an arbitrary pet position inside the visual viewport (used outside tours). */
export function clampToViewport(
  x: number,
  y: number,
  petSize: number,
  viewport: { width: number; height: number },
  margin = 16,
): { x: number; y: number } {
  const maxX = Math.max(margin, viewport.width - margin - petSize);
  const maxY = Math.max(margin, viewport.height - margin - petSize);
  return { x: Math.min(Math.max(x, margin), maxX), y: Math.min(Math.max(y, margin), maxY) };
}
