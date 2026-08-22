import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  blendStageParams,
  breakpointFor,
  capabilitiesFor,
  clamp,
  clamp01,
  clampToViewport,
  createGuideEngine,
  createPetRuntime,
  createPetStore,
  edgeGapFor,
  INTERACTION_LINES,
  moodLine,
  mulberry32,
  petSizeFor,
  PoseEngine,
  resolveMotionProfile,
  resolvePlacement,
  selectIdleAction,
  STAGE_ORDER,
  stageParamsFor,
  TOURS,
  type GuideAction,
  type GuideTour,
  type IdleAction,
  type IdleContext,
  type LifeStage,
  type MotionProfile,
  type PetPose,
  type Rect,
  type StageParams,
  type StorageLike,
} from '@pet/core';
import { PetContext, type PetActions, type PetContextValue, type PetSpeech } from './context.js';
import {
  avoidRects,
  findTarget,
  isTypingElement,
  onReducedMotionChange,
  prefersReducedMotion,
  rectOf,
  scrollTargetIntoView,
  viewportSize,
  waitForTargetRect,
} from './dom.js';

/** Rough bubble box used only to score placements; the real bubble sizes itself. */
const BUBBLE_ESTIMATE = { width: 264, height: 120 } as const;
const IDLE_GAP_MIN_MS = 1_600;
const IDLE_GAP_MAX_MS = 5_200;
/** Silence long enough to count as neglect; matches the copy tone, not a punishment. */
const IGNORED_AFTER_MS = 180_000;
const LONG_ABSENCE_MS = 6 * 3_600_000;
const PET_LINE_GAP_MS = 6_000;
const NEARBY_PX = 220;

const GUIDE_POSE: Record<GuideAction, PetPose> = {
  point: 'point',
  look: 'stand',
  wave: 'wave',
  celebrate: 'celebrate',
  sit: 'sit',
};

/**
 * Proportions are interpolated *between* stages so growth is continuous: a pet halfway
 * through `young` is visibly bigger than one that just got there.
 */
function growingParams(stage: LifeStage, progress: number): StageParams {
  const from = stageParamsFor(stage);
  const next = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
  return next ? blendStageParams(from, stageParamsFor(next), clamp01(progress)) : from;
}

function dockPosition(viewport: { width: number; height: number }, size: number): { x: number; y: number } {
  const gap = edgeGapFor(viewport.width);
  return { x: viewport.width - size - gap, y: viewport.height - size - gap };
}

export interface PetProviderProps {
  children: ReactNode;
  /** `null` runs entirely in memory — used by tests and by pages opened over `file://`. */
  storage?: StorageLike | null;
  now?: () => number;
  tours?: readonly GuideTour[];
  /** Domain ticker period. Animation runs on each renderer's own loop, never here. */
  logicIntervalMs?: number;
  /** Seeded RNG so idle behaviour is reproducible in tests. */
  seed?: number;
  /** Set `false` to skip the opening line (the state gallery does). */
  greeting?: boolean;
}

/**
 * Owns the domain: one store, one mutable runtime, one pose engine, one guide engine.
 *
 * The provider deliberately does **not** run an animation frame loop. It ticks the
 * simulation about once a second and writes low-frequency facts into the mutable
 * `PetRuntime`; whichever renderer is mounted drives `engine.update(dt)` itself. That is
 * what lets the identical domain layer serve the SVG and the PixiJS solution.
 */
export function PetProvider(props: PetProviderProps): ReactElement {
  const { children, storage, now, tours = TOURS, logicIntervalMs = 1_000, seed, greeting = true } = props;

  const clock = useMemo(() => now ?? (() => Date.now()), [now]);
  // Created once per provider: recreating them would restart the pet's life.
  const store = useMemo(() => createPetStore({ storage, now: clock }), []);
  const runtime = useMemo(() => createPetRuntime(), []);
  const engine = useMemo(() => new PoseEngine(runtime, { rng: mulberry32(seed ?? 0x5eed_c0de) }), [runtime, seed]);
  const rng = useMemo(() => mulberry32((seed ?? 0x5eed_c0de) ^ 0x9e37_79b9), [seed]);

  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [viewport, setViewport] = useState(viewportSize);
  const [hovered, setHovered] = useState(false);
  const [pose, setPose] = useState<PetPose>('stand');
  const [speech, setSpeech] = useState<PetSpeech | null>(null);
  const [highlight, setHighlight] = useState<Rect | null>(null);
  const [bubbleSide, setBubbleSide] = useState<'left' | 'right'>('left');
  const [position, setPosition] = useState(() => {
    const initial = viewportSize();
    return dockPosition(initial, petSizeFor(initial.width, false));
  });

  const motion: MotionProfile = resolveMotionProfile(reduced, state.preferences.motionOverride);
  const capabilities = capabilitiesFor(motion);
  const breakpoint = breakpointFor(viewport.width);

  // Latest-value mirrors: the callbacks below are created once but must never read a
  // stale snapshot, and none of them belong in a dependency array.
  const stateRef = useRef(state);
  const viewportRef = useRef(viewport);
  const capsRef = useRef(capabilities);
  const sizeRef = useRef(petSizeFor(viewport.width, false));
  const guideActiveRef = useRef(false);
  const typingRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const performedRef = useRef<Partial<Record<IdleAction, number>>>({});
  const nextIdleRef = useRef(0);
  const lastPetLineRef = useRef(0);
  const lastIgnoredRef = useRef(0);
  const speechTimerRef = useRef<number | null>(null);
  const timersRef = useRef(new Set<number>());

  /** Every timeout is tracked so unmounting cannot leave one running. */
  const later = useCallback((fn: () => void, ms: number): void => {
    const handle = window.setTimeout(() => {
      timersRef.current.delete(handle);
      fn();
    }, ms);
    timersRef.current.add(handle);
  }, []);

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        if (ms <= 0) {
          resolve();
          return;
        }
        later(resolve, ms);
      }),
    [later],
  );

  const say = useCallback(
    (text: string, holdMs = 4_200, source: PetSpeech['source'] = 'reaction') => {
      if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
      setSpeech({ text, source });
      speechTimerRef.current = window.setTimeout(() => {
        speechTimerRef.current = null;
        setSpeech(null);
      }, holdMs);
    },
    [],
  );

  const silence = useCallback(() => {
    if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
    speechTimerRef.current = null;
    setSpeech(null);
  }, []);

  /** Spontaneous lines respect `muted`; guide messages are the user's own request. */
  const maybeSay = useCallback(
    (text: string, holdMs?: number, source?: PetSpeech['source']) => {
      if (stateRef.current.preferences.muted) return;
      say(text, holdMs, source);
    },
    [say],
  );

  /**
   * Moves the pet in viewport coordinates and resolves when the CSS/ticker travel is over,
   * so the guide engine can await a real arrival. `petSize` is passed explicitly by callers
   * that know the pet is about to grow, avoiding a one-render lag in the clamp.
   */
  const moveTo = useCallback(
    async (x: number, y: number, petSize?: number): Promise<void> => {
      const vp = viewportRef.current;
      const size = petSize ?? sizeRef.current;
      const next = clampToViewport(x, y, size, vp, edgeGapFor(vp.width));
      setPosition(next);
      await wait(capsRef.current.travelMs);
    },
    [wait],
  );

  const returnToDock = useCallback(async (): Promise<void> => {
    const vp = viewportRef.current;
    const size = petSizeFor(vp.width, guideActiveRef.current);
    const dock = dockPosition(vp, size);
    await moveTo(dock.x, dock.y, size);
  }, [moveTo]);

  /** Any deliberate interaction ends a nap. */
  const wake = useCallback(() => {
    setPose((current) => (current === 'sleep' || current === 'sit' ? 'stand' : current));
    if (stateRef.current.activity === 'sleeping') store.dispatch({ type: 'SET_ACTIVITY', activity: 'idle' });
  }, [store]);

  const finishTour = useCallback(() => {
    setHighlight(null);
    setPose('stand');
    store.dispatch({ type: 'SET_ACTIVITY', activity: 'idle' });
    void returnToDock();
  }, [returnToDock, store]);

  const guide = useMemo(
    () =>
      createGuideEngine({
        currentRoute: () => (typeof window === 'undefined' ? '#home' : window.location.hash || '#home'),
        navigate: (route) => {
          if (typeof window !== 'undefined') window.location.hash = route;
        },
        waitForTarget: (target, timeoutMs) => waitForTargetRect(target, timeoutMs),
        scrollToTarget: (target) => scrollTargetIntoView(target, capsRef.current.amplitude > 0),
        async movePetToTarget(step, rect) {
          setPose(GUIDE_POSE[step.action]);
          setHighlight(rect);
          const vp = viewportRef.current;
          // A guiding pet is always engaged, so resolve the placement at companion size.
          const petSize = petSizeFor(vp.width, true);
          const placement = resolvePlacement({
            target: rect,
            viewport: vp,
            petSize,
            bubble: BUBBLE_ESTIMATE,
            preferred: step.preferredPlacement,
            margin: edgeGapFor(vp.width),
            avoid: avoidRects([rect]),
          });
          setBubbleSide(placement.bubbleSide);
          await moveTo(placement.x, placement.y, petSize);
        },
        onTargetClick: (target, handler) => {
          const element = findTarget(target);
          if (!element) return () => {};
          element.addEventListener('click', handler);
          return () => element.removeEventListener('click', handler);
        },
        onSiteEvent: (event, handler) => {
          if (typeof window === 'undefined') return () => {};
          window.addEventListener(event, handler);
          return () => window.removeEventListener(event, handler);
        },
        onStepComplete: () => {
          store.dispatch({ type: 'EVENT', kind: 'TOUR_STEP_COMPLETED', at: clock() });
          runtime.trigger('nod');
        },
        onTourComplete: (tour) => {
          const at = clock();
          store.dispatch({ type: 'EVENT', kind: 'TOUR_COMPLETED', at });
          store.dispatch({ type: 'TOUR_COMPLETED', id: tour.id, at });
          runtime.trigger(capsRef.current.particles ? 'sparkle' : 'wave');
          say(INTERACTION_LINES.tourComplete, 5_600, 'guide');
          finishTour();
        },
        onExit: () => {
          say(INTERACTION_LINES.tourExited, 3_400, 'guide');
          finishTour();
        },
      }),
    [clock, finishTour, moveTo, runtime, say, store],
  );

  const guideState = useSyncExternalStore(guide.subscribe, guide.getState, guide.getState);

  // Engagement drives the footprint: docked at 64px, companion-sized while the pet is
  // talking, hovered or guiding (brand `pet.png` sizing).
  const engaged = guideState.active || hovered || speech !== null;
  const size = petSizeFor(viewport.width, engaged);

  stateRef.current = state;
  viewportRef.current = viewport;
  capsRef.current = capabilities;
  sizeRef.current = size;
  guideActiveRef.current = guideState.active;

  const startTour = useCallback(
    (tourId: string) => {
      const tour = tours.find((candidate) => candidate.id === tourId);
      if (!tour) return;
      silence();
      wake();
      store.dispatch({ type: 'SET_ACTIVITY', activity: 'guiding' });
      void guide.start(tour);
    },
    [guide, silence, store, tours, wake],
  );

  const actions = useMemo<PetActions>(
    () => ({
      say: (text, holdMs) => say(text, holdMs),
      silence,
      trigger: (kind) => runtime.trigger(kind),
      tap() {
        const at = clock();
        wake();
        store.dispatch({ type: 'EVENT', kind: 'CLICKED', at });
        runtime.trigger('nod');
        maybeSay(moodLine(stateRef.current.mood, at / 1_000), 3_600, 'reaction');
      },
      petted(weight) {
        const at = clock();
        wake();
        store.dispatch({ type: 'EVENT', kind: 'PETTED', at, weight: clamp01(weight) });
        runtime.trigger(capsRef.current.particles ? 'heart' : 'squash');
        if (at - lastPetLineRef.current < PET_LINE_GAP_MS) return;
        lastPetLineRef.current = at;
        maybeSay(INTERACTION_LINES.petted, 3_000, 'reaction');
      },
      setPetting: (intensity) => runtime.set({ petting: clamp01(intensity) }),
      setHovered,
      setPose,

      setMotionOverride: (profile) =>
        store.dispatch({ type: 'SET_PREFERENCES', patch: { motionOverride: profile }, now: clock() }),
      setHidden(hidden) {
        store.dispatch({ type: 'SET_PREFERENCES', patch: { hidden }, now: clock() });
        if (hidden) {
          silence();
          guide.exit();
        }
      },
      setPaused: (paused) => store.dispatch({ type: 'SET_PREFERENCES', patch: { paused }, now: clock() }),
      setMuted(muted) {
        store.dispatch({ type: 'SET_PREFERENCES', patch: { muted }, now: clock() });
        if (muted) silence();
      },
      reset() {
        guide.exit();
        silence();
        setPose('stand');
        setHighlight(null);
        performedRef.current = {};
        store.dispatch({ type: 'RESET', now: clock() });
        void returnToDock();
      },
      startTour,
      moveTo: (x, y) => moveTo(x, y),
      returnToDock,
    }),
    [clock, guide, maybeSay, moveTo, returnToDock, runtime, say, silence, startTour, store, wake],
  );

  // One write per meaningful change — never per frame. The renderer reads this object on
  // every tick, so React state stays out of the animation path entirely.
  useEffect(() => {
    runtime.set({
      mood: state.mood,
      activity: guideState.active ? 'guiding' : state.activity,
      stage: state.stage,
      stageParams: growingParams(state.stage, state.stageProgress),
      needs: state.needs,
      motion,
      capabilities,
      pose,
      engaged,
      sizePx: size,
      visible: !state.preferences.hidden,
      paused: state.preferences.paused,
      guideActive: guideState.active,
      // Face the middle of the page: a pet docked bottom-right looks inward, not off-screen.
      facing: position.x + size / 2 > viewport.width / 2 ? -1 : 1,
      targetFps: motion === 'full' ? 60 : 30,
    });
  }, [
    capabilities,
    engaged,
    guideState.active,
    motion,
    pose,
    position.x,
    runtime,
    size,
    state,
    viewport.width,
  ]);

  useEffect(() => {
    runtime.set({ speaking: speech !== null || guideState.status === 'speaking' });
  }, [guideState.status, runtime, speech]);

  useEffect(() => onReducedMotionChange(setReduced), []);

  useEffect(() => {
    const update = () => setViewport(viewportSize());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  /** Outside a tour the pet always returns to its dock, including after a resize. */
  useEffect(() => {
    if (guideState.active) return;
    const dock = dockPosition(viewport, size);
    setPosition((current) => (current.x === dock.x && current.y === dock.y ? current : dock));
  }, [guideState.active, size, viewport]);

  /** Gaze follows the pointer; a nearby pointer also unlocks the `inspectPointer` idle. */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      const caps = capsRef.current;
      if (!caps.pupilTracking) {
        runtime.set({ gaze: { x: 0, y: 0 } });
        return;
      }
      const centerX = position.x + size / 2;
      const centerY = position.y + size / 2;
      const span = Math.max(240, size * 4);
      runtime.set({
        gaze: {
          x: clamp((event.clientX - centerX) / span, -1, 1),
          y: clamp((event.clientY - centerY) / span, -1, 1),
        },
      });
    };
    const onLeave = () => {
      pointerRef.current = null;
      runtime.set({ gaze: { x: 0, y: 0 } });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [position.x, position.y, runtime, size]);

  useEffect(() => {
    runtime.set({ pointerInside: hovered });
  }, [hovered, runtime]);

  /** While the user types, the pet holds still and only blinks (brief requirement). */
  useEffect(() => {
    const update = () => {
      const typing = isTypingElement(document.activeElement);
      typingRef.current = typing;
      runtime.set({ typing });
    };
    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, [runtime]);

  /** A hidden tab costs nothing: the ticker skips work and the snapshot is written out. */
  useEffect(() => {
    const update = () => {
      if (document.hidden) {
        store.flush();
        return;
      }
      store.dispatch({ type: 'TICK', now: clock() });
    };
    const flush = () => store.flush();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pagehide', flush);
    };
  }, [clock, store]);

  /** Escape leaves a tour, matching the dialog convention users already expect. */
  useEffect(() => {
    if (!guideState.active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') guide.exit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [guide, guideState.active]);

  /** The highlight must stay glued to its target through scrolling and reflow. */
  useEffect(() => {
    const step = guideState.step;
    if (!step || !guideState.active) return;
    const update = () => {
      const element = findTarget(step.target);
      setHighlight(element ? rectOf(element) : null);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [guideState.active, guideState.step]);

  const applyIdle = useCallback(
    (action: IdleAction, at: number) => {
      performedRef.current[action] = at;
      switch (action) {
        case 'blink':
          runtime.trigger('blink');
          break;
        case 'lookAround':
        case 'inspectPointer':
        case 'inspectTarget':
          runtime.trigger('lookAround');
          break;
        case 'earTwitch':
          runtime.trigger('earTwitch');
          break;
        case 'tailWag':
          runtime.trigger('bounce');
          break;
        case 'stretch':
          runtime.trigger('stretch');
          break;
        case 'yawn':
          runtime.trigger('yawn');
          break;
        case 'sit':
          setPose('sit');
          later(() => setPose((current) => (current === 'sit' ? 'stand' : current)), 9_000);
          break;
        case 'sleep':
          setPose('sleep');
          store.dispatch({ type: 'SET_ACTIVITY', activity: 'sleeping' });
          break;
      }
    },
    [later, runtime, store],
  );

  // Declared next to its only reader: the ticker needs the live position without
  // restarting the interval every time the pet moves.
  const positionRef = useRef(position);
  positionRef.current = position;

  /**
   * The domain ticker: needs drift, mood, neglect and idle behaviour. About once a second,
   * skipped entirely while the tab is hidden. Nothing here touches the animation.
   */
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const at = clock();
      store.dispatch({ type: 'TICK', now: at });

      const current = stateRef.current;
      if (
        !guideActiveRef.current &&
        at - current.lastInteractionAt > IGNORED_AFTER_MS &&
        at - lastIgnoredRef.current > IGNORED_AFTER_MS
      ) {
        lastIgnoredRef.current = at;
        store.dispatch({ type: 'EVENT', kind: 'IGNORED', at });
      }

      if (at < nextIdleRef.current) return;
      const footprint = sizeRef.current;
      const pet = positionRef.current;
      const pointer = pointerRef.current;
      const distance = pointer
        ? Math.hypot(pointer.x - (pet.x + footprint / 2), pointer.y - (pet.y + footprint / 2))
        : Number.POSITIVE_INFINITY;
      const action = selectIdleAction(
        {
          mood: current.mood,
          needs: current.needs,
          activity: current.activity,
          now: at,
          lastPerformedAt: performedRef.current,
          typing: typingRef.current,
          guideActive: guideActiveRef.current,
          pointerNearby: distance < NEARBY_PX,
          targetNearby: nearTarget(pet, footprint),
          capabilities: capsRef.current,
        } satisfies IdleContext,
        rng,
      );
      nextIdleRef.current = at + IDLE_GAP_MIN_MS + rng() * (IDLE_GAP_MAX_MS - IDLE_GAP_MIN_MS);
      if (action) applyIdle(action, at);
    }, logicIntervalMs);
    return () => window.clearInterval(interval);
  }, [applyIdle, clock, logicIntervalMs, rng, store]);

  /** One opening line, chosen by how long the pet has been alone. */
  useEffect(() => {
    if (!greeting) return;
    const { existed, offlineMs } = store.hydration;
    const line = !existed
      ? INTERACTION_LINES.greetingFirstVisit
      : offlineMs >= LONG_ABSENCE_MS
        ? INTERACTION_LINES.greetingLongAbsence
        : INTERACTION_LINES.greetingReturning;
    if (existed && offlineMs > 1_800_000) {
      store.dispatch({ type: 'EVENT', kind: 'USER_RETURNED', at: clock() });
    }
    later(() => {
      if (stateRef.current.preferences.hidden) return;
      maybeSay(line, 5_200, 'greeting');
      runtime.trigger('wave');
    }, 900);
  }, []);

  useEffect(
    () => () => {
      for (const handle of timersRef.current) window.clearTimeout(handle);
      timersRef.current.clear();
      if (speechTimerRef.current !== null) window.clearTimeout(speechTimerRef.current);
      guide.dispose();
      store.flush();
      store.destroy();
    },
    [guide, store],
  );

  const tourList = useMemo(() => tours.map((tour) => ({ id: tour.id, title: tour.title })), [tours]);

  const value: PetContextValue = {
    store,
    runtime,
    engine,
    state,
    motion,
    capabilities,
    breakpoint,
    size,
    position,
    engaged,
    speech,
    bubbleSide,
    guide,
    guideState,
    highlight,
    tours: tourList,
    storageAvailable: store.storageAvailable,
    actions,
  };

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

/**
 * True when the pet is resting near any `data-pet-target`, which unlocks the
 * `inspectTarget` idle. Runs at ticker frequency (~1Hz), never per frame.
 */
function nearTarget(pet: { x: number; y: number }, size: number): boolean {
  if (typeof document === 'undefined') return false;
  const centerX = pet.x + size / 2;
  const centerY = pet.y + size / 2;
  const nodes = document.querySelectorAll('[data-pet-target]');
  for (let index = 0; index < nodes.length; index += 1) {
    const element = nodes[index];
    if (!element) continue;
    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    const dx = Math.max(box.left - centerX, 0, centerX - box.right);
    const dy = Math.max(box.top - centerY, 0, centerY - box.bottom);
    if (Math.hypot(dx, dy) < NEARBY_PX) return true;
  }
  return false;
}
