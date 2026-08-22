import { describe, expect, it, vi } from 'vitest';
import { createGuideEngine } from '../src/guide/engine.js';
import { DEFAULT_TARGET_TIMEOUT_MS } from '../src/guide/types.js';
import { createGuideHarness, step, tick, tour } from './helpers/guideHarness.js';

describe('guide engine', () => {
  it('walks a manual tour and reports completion once', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(tour('welcome', [step('a'), step('b')]));

    await tick();
    expect(engine.getState().status).toBe('speaking');
    expect(engine.getState().stepIndex).toBe(0);
    expect(engine.getState().stepCount).toBe(2);
    expect(harness.moves).toEqual(['a']);

    engine.next();
    await tick();
    expect(engine.getState().stepIndex).toBe(1);

    engine.next();
    await done;
    expect(engine.getState().status).toBe('completed');
    expect(engine.getState().active).toBe(false);
    expect(harness.completed).toEqual(['a', 'b']);
    expect(harness.toursCompleted).toEqual(['welcome']);
  });

  it('navigates and scrolls before waiting for a target', async () => {
    const harness = createGuideHarness('#home');
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(tour('t', [step('s1', { route: '#speak', autoScroll: true })]));

    await tick();
    expect(harness.route.value).toBe('#speak');
    expect(harness.scrolled).toEqual(['s1-target']);
    expect(harness.waits[0]).toEqual({ target: 's1-target', timeoutMs: DEFAULT_TARGET_TIMEOUT_MS });

    engine.next();
    await done;
  });

  it('parks in target-missing after the bounded wait, then recovers on retry', async () => {
    const harness = createGuideHarness();
    harness.missing.add('ghost-target');
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(tour('t', [step('ghost', { targetTimeoutMs: 900 }), step('s2')]));

    await tick();
    expect(harness.waits[0]).toEqual({ target: 'ghost-target', timeoutMs: 900 });
    expect(engine.getState().status).toBe('target-missing');
    expect(engine.getState().stepIndex).toBe(0);

    harness.missing.delete('ghost-target');
    engine.retry();
    await tick();
    expect(engine.getState().status).toBe('speaking');
    expect(engine.getState().attempt).toBe(1);

    engine.next();
    await tick();
    engine.next();
    await done;
    expect(harness.completed).toEqual(['ghost', 's2']);
  });

  it('skips a permanently missing step without marking it complete', async () => {
    const harness = createGuideHarness();
    harness.missing.add('ghost-target');
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(tour('t', [step('ghost'), step('s2')]));

    await tick();
    engine.skip();
    await tick();
    expect(engine.getState().stepIndex).toBe(1);
    expect(engine.getState().status).toBe('speaking');
    expect(harness.completed).toEqual([]);

    engine.next();
    await done;
    expect(harness.completed).toEqual(['s2']);
    expect(harness.toursCompleted).toEqual(['t']);
  });

  it('advances when the step target itself is clicked', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(
      tour('t', [step('hero', { target: 'hero-cta', completion: { type: 'target-click' } }), step('s2')]),
    );

    await tick();
    harness.clickTarget('some-other-button');
    await tick();
    expect(engine.getState().stepIndex).toBe(0);

    harness.clickTarget('hero-cta');
    await tick();
    expect(engine.getState().stepIndex).toBe(1);
    expect(harness.completed).toEqual(['hero']);

    engine.next();
    await done;
  });

  it('advances on a named site event and then stops listening', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(
      tour('t', [
        step('practice', { completion: { type: 'site-event', event: 'practice-submitted' } }),
        step('s2'),
      ]),
    );

    await tick();
    harness.emitSiteEvent('something-else');
    await tick();
    expect(engine.getState().stepIndex).toBe(0);

    harness.emitSiteEvent('practice-submitted');
    await tick();
    expect(engine.getState().stepIndex).toBe(1);

    // The listener from step 1 must be gone, so a late event cannot skip step 2.
    harness.emitSiteEvent('practice-submitted');
    await tick();
    expect(engine.getState().stepIndex).toBe(1);

    engine.next();
    await done;
    expect(harness.completed).toEqual(['practice', 's2']);
  });

  it('steps backwards without completing the step it leaves', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(tour('t', [step('a'), step('b')]));

    await tick();
    engine.next();
    await tick();
    expect(engine.getState().stepIndex).toBe(1);

    engine.back();
    await tick();
    expect(engine.getState().stepIndex).toBe(0);

    engine.next();
    await tick();
    engine.next();
    await done;
    expect(harness.completed).toEqual(['a', 'a', 'b']);
  });

  it('exits on demand and never completes the tour afterwards', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const done = engine.start(tour('t', [step('a'), step('b')]));

    await tick();
    engine.exit();
    expect(engine.getState().status).toBe('exited');
    expect(engine.getState().active).toBe(false);
    expect(engine.getState().step).toBeNull();

    await done;
    expect(harness.exits).toEqual([{ tourId: 't', stepIndex: 0 }]);
    expect(harness.toursCompleted).toEqual([]);
    expect(harness.completed).toEqual([]);
  });

  it('lets a new tour supersede a running one without cross-talk', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const first = engine.start(tour('first', [step('a'), step('b')]));
    await tick();

    const second = engine.start(tour('second', [step('c')]));
    await first;
    await tick();
    expect(engine.getState().tourId).toBe('second');
    expect(engine.getState().stepIndex).toBe(0);

    engine.next();
    await second;
    expect(harness.toursCompleted).toEqual(['second']);
    expect(harness.completed).toEqual(['c']);
  });

  it('notifies subscribers and stops after dispose', async () => {
    const harness = createGuideHarness();
    const engine = createGuideEngine(harness.deps);
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);

    const done = engine.start(tour('t', [step('a')]));
    await tick();
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    const calls = listener.mock.calls.length;
    engine.dispose();
    await done;
    engine.next();
    expect(listener.mock.calls.length).toBe(calls);
  });
});
