import type { GuideDeps } from '../../src/guide/engine.js';
import type { Rect } from '../../src/guide/placement.js';
import type { GuideCompletion, GuidePlacement, GuideStep, GuideTour } from '../../src/guide/types.js';

/** Lets the sequential engine finish every pending microtask before we assert. */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export const targetRect = (x = 120, y = 200): Rect => ({ x, y, width: 140, height: 44 });

export function step(id: string, patch: Partial<GuideStep> = {}): GuideStep {
  return {
    id,
    target: `${id}-target`,
    message: `Message for ${id}`,
    preferredPlacement: 'auto' as GuidePlacement | 'auto',
    action: 'point',
    completion: { type: 'manual' } as GuideCompletion,
    ...patch,
  };
}

export const tour = (id: string, steps: readonly GuideStep[]): GuideTour => ({ id, title: id, steps });

export interface GuideHarness {
  deps: GuideDeps;
  /** Targets in here resolve as "not found" so the bounded wait expires. */
  missing: Set<string>;
  waits: Array<{ target: string; timeoutMs: number }>;
  route: { value: string };
  scrolled: string[];
  moves: string[];
  completed: string[];
  toursCompleted: string[];
  exits: Array<{ tourId: string; stepIndex: number }>;
  clickTarget(target: string): void;
  emitSiteEvent(event: string): void;
}

export function createGuideHarness(initialRoute = '#home'): GuideHarness {
  const missing = new Set<string>();
  const waits: Array<{ target: string; timeoutMs: number }> = [];
  const route = { value: initialRoute };
  const scrolled: string[] = [];
  const moves: string[] = [];
  const completed: string[] = [];
  const toursCompleted: string[] = [];
  const exits: Array<{ tourId: string; stepIndex: number }> = [];
  const clickHandlers = new Map<string, Set<() => void>>();
  const eventHandlers = new Map<string, Set<() => void>>();

  const subscribe = (map: Map<string, Set<() => void>>, key: string, handler: () => void): (() => void) => {
    const set = map.get(key) ?? new Set<() => void>();
    set.add(handler);
    map.set(key, set);
    return () => void set.delete(handler);
  };
  const fire = (map: Map<string, Set<() => void>>, key: string): void => {
    for (const handler of [...(map.get(key) ?? [])]) handler();
  };

  const deps: GuideDeps = {
    currentRoute: () => route.value,
    navigate: (next) => void (route.value = next),
    waitForTarget: async (target, timeoutMs) => {
      waits.push({ target, timeoutMs });
      return missing.has(target) ? null : targetRect();
    },
    scrollToTarget: (target) => void scrolled.push(target),
    movePetToTarget: (current) => void moves.push(current.id),
    onTargetClick: (target, handler) => subscribe(clickHandlers, target, handler),
    onSiteEvent: (event, handler) => subscribe(eventHandlers, event, handler),
    onStepComplete: (current) => void completed.push(current.id),
    onTourComplete: (current) => void toursCompleted.push(current.id),
    onExit: (current, stepIndex) => void exits.push({ tourId: current.id, stepIndex }),
  };

  return {
    deps,
    missing,
    waits,
    route,
    scrolled,
    moves,
    completed,
    toursCompleted,
    exits,
    clickTarget: (target) => fire(clickHandlers, target),
    emitSiteEvent: (event) => fire(eventHandlers, event),
  };
}
