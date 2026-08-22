import type { Rect } from './placement.js';
import { DEFAULT_TARGET_TIMEOUT_MS, type GuideState, type GuideStep, type GuideTour } from './types.js';

type Control = 'advance' | 'back' | 'skip' | 'exit' | 'retry';

export interface GuideDeps {
  currentRoute(): string;
  navigate(route: string): void | Promise<void>;
  /** Resolves with the target rect, or `null` when the bounded wait expires. */
  waitForTarget(target: string, timeoutMs: number): Promise<Rect | null>;
  scrollToTarget?(target: string): void | Promise<void>;
  /** Walks the pet next to the resolved rect; resolves when the move finishes. */
  movePetToTarget(step: GuideStep, rect: Rect): void | Promise<void>;
  onTargetClick(target: string, handler: () => void): () => void;
  onSiteEvent(event: string, handler: () => void): () => void;
  onStepEnter?(step: GuideStep, rect: Rect): void;
  onStepComplete?(step: GuideStep): void;
  onTourComplete?(tour: GuideTour): void;
  onExit?(tour: GuideTour, stepIndex: number): void;
}

export interface GuideEngine {
  getState(): GuideState;
  subscribe(listener: () => void): () => void;
  start(tour: GuideTour): Promise<void>;
  next(): void;
  back(): void;
  skip(): void;
  retry(): void;
  exit(): void;
  dispose(): void;
}

const IDLE_STATE: GuideState = {
  tourId: null,
  status: 'idle',
  stepIndex: 0,
  stepCount: 0,
  step: null,
  attempt: 0,
  active: false,
};

/**
 * Sequences a tour: navigate → wait for target → walk → speak → wait for completion.
 * A missing target parks the machine in `target-missing` with Retry / Skip / Exit
 * instead of deadlocking, and every await is guarded by a run token so exiting or
 * restarting a tour can never let an orphaned step write state again.
 */
export function createGuideEngine(deps: GuideDeps): GuideEngine {
  let state: GuideState = { ...IDLE_STATE };
  let tour: GuideTour | null = null;
  let runToken = 0;
  let resolveControl: ((signal: Control) => void) | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };
  const setState = (patch: Partial<GuideState>) => {
    state = { ...state, ...patch };
    emit();
  };
  // Only the sequential runner ever waits, so there is at most one pending control.
  const waitForControl = () => new Promise<Control>((resolve) => void (resolveControl = resolve));
  const send = (signal: Control) => {
    const resolve = resolveControl;
    resolveControl = null;
    resolve?.(signal);
  };

  async function awaitCompletion(step: GuideStep): Promise<Control> {
    const disposers: Array<() => void> = [];
    const manual = waitForControl();
    const automatic = new Promise<Control>((resolve) => {
      if (step.completion.type === 'target-click') {
        disposers.push(deps.onTargetClick(step.target, () => resolve('advance')));
      } else if (step.completion.type === 'site-event') {
        disposers.push(deps.onSiteEvent(step.completion.event, () => resolve('advance')));
      }
    });
    const signal = await Promise.race([manual, automatic]);
    resolveControl = null;
    for (const dispose of disposers) dispose();
    return signal;
  }

  async function runStep(step: GuideStep, token: number): Promise<Control> {
    let attempt = 0;
    for (;;) {
      if (step.route && deps.currentRoute() !== step.route) {
        setState({ status: 'navigating' });
        await deps.navigate(step.route);
      }
      if (token !== runToken) return 'exit';

      setState({ status: 'waiting-for-target', attempt });
      const rect = await deps.waitForTarget(step.target, step.targetTimeoutMs ?? DEFAULT_TARGET_TIMEOUT_MS);
      if (token !== runToken) return 'exit';

      if (!rect) {
        setState({ status: 'target-missing' });
        const signal = await waitForControl();
        if (signal === 'retry') {
          attempt += 1;
          continue;
        }
        return signal === 'advance' ? 'skip' : signal;
      }

      if (step.autoScroll) await deps.scrollToTarget?.(step.target);
      setState({ status: 'moving' });
      await deps.movePetToTarget(step, rect);
      if (token !== runToken) return 'exit';

      setState({ status: 'speaking' });
      deps.onStepEnter?.(step, rect);
      const signal = await awaitCompletion(step);
      if (signal === 'retry') {
        attempt += 1;
        continue;
      }
      return signal;
    }
  }

  async function run(current: GuideTour, token: number): Promise<void> {
    let index = 0;
    while (index < current.steps.length) {
      const step = current.steps[index];
      if (!step) break;
      setState({ step, stepIndex: index, status: 'idle', attempt: 0, active: true });
      const outcome = await runStep(step, token);
      if (token !== runToken) return;
      if (outcome === 'exit') {
        setState({ status: 'exited', active: false, step: null });
        deps.onExit?.(current, index);
        return;
      }
      if (outcome === 'back') {
        index = Math.max(0, index - 1);
        continue;
      }
      if (outcome === 'advance') deps.onStepComplete?.(step);
      index += 1;
    }
    if (token !== runToken) return;
    setState({ status: 'completed', active: false, step: null });
    deps.onTourComplete?.(current);
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    async start(next) {
      runToken += 1;
      send('exit');
      tour = next;
      state = { ...IDLE_STATE, tourId: next.id, stepCount: next.steps.length, active: true };
      emit();
      await run(next, runToken);
    },
    next: () => send('advance'),
    back: () => send('back'),
    skip: () => send('skip'),
    retry: () => send('retry'),
    exit() {
      if (!state.active || !tour) return;
      runToken += 1;
      const stepIndex = state.stepIndex;
      const current = tour;
      setState({ status: 'exited', active: false, step: null });
      send('exit');
      deps.onExit?.(current, stepIndex);
    },
    dispose() {
      runToken += 1;
      send('exit');
      listeners.clear();
    },
  };
}
