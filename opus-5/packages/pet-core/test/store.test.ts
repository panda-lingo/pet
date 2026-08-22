import { describe, expect, it } from 'vitest';
import { createPetStore } from '../src/createStore.js';
import { defaultNeeds } from '../src/needs.js';
import { createMemoryStorage, saveSnapshot, STORAGE_KEY, type StorageLike } from '../src/persistence.js';
import { defaultSnapshot } from '../src/snapshot.js';
import { petReducer, stateFromSnapshot, toSnapshot, type PetAction } from '../src/store.js';
import type { PetState } from '../src/types.js';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

const base = (): PetState => stateFromSnapshot(defaultSnapshot(NOW), NOW);

const apply = (state: PetState, ...actions: PetAction[]): PetState =>
  actions.reduce((current, action) => petReducer(current, action), state);

describe('pet reducer', () => {
  it('starts neutral from the default snapshot', () => {
    const state = base();
    expect(state.mood).toBe('neutral');
    expect(state.needs).toEqual(defaultNeeds());
    expect(state.activity).toBe('idle');
    expect(state.stage).toBe('baby');
    expect(state.xp).toBe(0);
  });

  it('drifts needs on a tick and refuses to move backwards', () => {
    const ticked = apply(base(), { type: 'TICK', now: NOW + HOUR });
    expect(ticked.needs.energy).toBeCloseTo(77, 5);
    expect(ticked.needs.hunger).toBeCloseTo(30.5, 5);
    expect(ticked.needs.affection).toBeCloseTo(51, 5);
    expect(ticked.lastUpdatedAt).toBe(NOW + HOUR);

    const state = base();
    expect(petReducer(state, { type: 'TICK', now: NOW })).toBe(state);
    expect(petReducer(state, { type: 'TICK', now: NOW - 1_000 })).toBe(state);
  });

  it('freezes the needs of a paused pet', () => {
    const paused = apply(base(), { type: 'SET_PREFERENCES', patch: { paused: true }, now: NOW });
    const ticked = apply(paused, { type: 'TICK', now: NOW + 8 * HOUR });
    expect(ticked.needs).toEqual(defaultNeeds());
    expect(ticked.lastUpdatedAt).toBe(NOW + 8 * HOUR);
  });

  it('recovers energy while asleep', () => {
    const asleep = apply(
      base(),
      { type: 'SET_ACTIVITY', activity: 'sleeping' },
      { type: 'TICK', now: NOW + HOUR },
    );
    expect(asleep.needs.energy).toBeCloseTo(98, 5);
    expect(asleep.needs.hunger).toBeCloseTo(27.5, 5);
  });

  it('applies an interaction to needs, xp and mood at once', () => {
    const played = apply(base(), { type: 'EVENT', kind: 'PLAYED', at: NOW + 5_000 });
    expect(played.needs.affection).toBe(66);
    expect(played.needs.curiosity).toBe(52);
    expect(played.needs.energy).toBe(74);
    expect(played.xp).toBe(8);
    expect(played.mood).toBe('excited');
    expect(played.moodChangedAt).toBe(NOW + 5_000);
    expect(played.lastInteractionAt).toBe(NOW + 5_000);
    expect(played.recentEvents).toHaveLength(1);
  });

  it('scales an interaction by its gesture weight', () => {
    const full = apply(base(), { type: 'EVENT', kind: 'PETTED', at: NOW });
    const half = apply(base(), { type: 'EVENT', kind: 'PETTED', at: NOW, weight: 0.5 });
    expect(full.needs.affection).toBe(72);
    expect(half.needs.affection).toBe(65);
    expect(full.xp).toBe(6);
    expect(half.xp).toBe(3);
  });

  it('clamps a large feed instead of overshooting', () => {
    const fed = apply(base(), { type: 'EVENT', kind: 'FED', at: NOW });
    expect(fed.needs.hunger).toBe(0);
    expect(fed.needs.energy).toBe(88);
    expect(fed.xp).toBe(5);
  });

  it('never rewinds the clock for a late event', () => {
    const state = apply(base(), { type: 'TICK', now: NOW + HOUR });
    const late = apply(state, { type: 'EVENT', kind: 'CLICKED', at: NOW + 60_000 });
    expect(late.lastUpdatedAt).toBe(NOW + HOUR);
    expect(late.lastInteractionAt).toBe(NOW + 60_000);
  });

  it('prunes events that no longer affect mood', () => {
    const clicked = apply(base(), { type: 'EVENT', kind: 'CLICKED', at: NOW });
    expect(clicked.recentEvents).toHaveLength(1);
    expect(apply(clicked, { type: 'TICK', now: NOW + 31_000 }).recentEvents).toHaveLength(0);
  });

  it('ignores a no-op activity change and records a tour once', () => {
    const state = base();
    expect(petReducer(state, { type: 'SET_ACTIVITY', activity: 'idle' })).toBe(state);
    expect(petReducer(state, { type: 'SET_ACTIVITY', activity: 'walking' }).activity).toBe('walking');

    const toured = apply(state, { type: 'TOUR_COMPLETED', id: 'welcome', at: NOW });
    expect(toured.completedTours).toEqual(['welcome']);
    expect(petReducer(toured, { type: 'TOUR_COMPLETED', id: 'welcome', at: NOW + 1 })).toBe(toured);
  });

  it('merges preference patches without dropping the others', () => {
    const state = apply(
      base(),
      { type: 'SET_PREFERENCES', patch: { muted: true }, now: NOW + 10 },
      { type: 'SET_PREFERENCES', patch: { motionOverride: 'full' }, now: NOW + 20 },
    );
    expect(state.preferences).toEqual({ hidden: false, paused: false, muted: true, motionOverride: 'full' });
    expect(state.lastUpdatedAt).toBe(NOW + 20);
  });

  it('resets to a newborn pet', () => {
    const lived = apply(
      base(),
      { type: 'EVENT', kind: 'TOUR_COMPLETED', at: NOW },
      { type: 'TOUR_COMPLETED', id: 'welcome', at: NOW },
    );
    const reset = apply(lived, { type: 'RESET', now: NOW + HOUR });
    expect(reset.xp).toBe(0);
    expect(reset.stage).toBe('baby');
    expect(reset.needs).toEqual(defaultNeeds());
    expect(reset.completedTours).toEqual([]);
    expect(reset.recentEvents).toEqual([]);
    expect(reset.bornAt).toBe(NOW + HOUR);
  });

  it('round-trips through a snapshot and drops transient state', () => {
    const lived = apply(
      base(),
      { type: 'EVENT', kind: 'PETTED', at: NOW },
      { type: 'TOUR_COMPLETED', id: 'welcome', at: NOW },
      { type: 'SET_ACTIVITY', activity: 'guiding' },
      { type: 'SET_PREFERENCES', patch: { hidden: true, motionOverride: 'still' }, now: NOW + 5 },
    );
    const restored = stateFromSnapshot(toSnapshot(lived), NOW + 5);
    expect(restored.needs).toEqual(lived.needs);
    expect(restored.xp).toBe(lived.xp);
    expect(restored.stage).toBe(lived.stage);
    expect(restored.completedTours).toEqual(['welcome']);
    expect(restored.unlockedActions).toEqual(['wave']);
    expect(restored.preferences).toEqual(lived.preferences);
    expect(restored.bornAt).toBe(NOW);
    expect(restored.activity).toBe('idle');
    expect(restored.recentEvents).toEqual([]);
  });
});

describe('pet store', () => {
  it('runs entirely in memory when storage is unavailable', () => {
    const store = createPetStore({ storage: null, now: () => NOW });
    expect(store.storageAvailable).toBe(false);
    expect(store.hydration).toEqual({ existed: false, recovered: false, offlineMs: 0 });
    store.dispatch({ type: 'EVENT', kind: 'CLICKED', at: NOW });
    expect(store.getState().xp).toBe(2);
    expect(() => store.flush()).not.toThrow();
    store.destroy();
  });

  it('coalesces writes and only notifies on real changes', () => {
    const storage = createMemoryStorage();
    const store = createPetStore({ storage, now: () => NOW });
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    store.dispatch({ type: 'SET_ACTIVITY', activity: 'idle' });
    expect(notifications).toBe(0);

    store.dispatch({ type: 'EVENT', kind: 'TOUR_COMPLETED', at: NOW });
    store.dispatch({ type: 'SET_ACTIVITY', activity: 'guiding' });
    expect(notifications).toBe(2);
    // Nothing has reached storage yet: both writes are still inside the debounce window.
    expect(storage.getItem(STORAGE_KEY)).toBeNull();

    store.flush();
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    unsubscribe();
    store.dispatch({ type: 'EVENT', kind: 'CLICKED', at: NOW + 10 });
    expect(notifications).toBe(2);

    store.destroy();
    const frozen = store.getState();
    store.dispatch({ type: 'EVENT', kind: 'PETTED', at: NOW + 20 });
    expect(store.getState()).toBe(frozen);
  });

  it('reloads what it saved and applies capped offline progress', () => {
    const storage = createMemoryStorage();
    const first = createPetStore({ storage, now: () => NOW });
    first.dispatch({ type: 'EVENT', kind: 'TOUR_COMPLETED', at: NOW });
    first.flush();
    first.destroy();

    const second = createPetStore({ storage, now: () => NOW + 2 * HOUR });
    expect(second.hydration).toEqual({ existed: true, recovered: false, offlineMs: 2 * HOUR });
    const state = second.getState();
    expect(state.xp).toBe(40);
    // The XP event is not the same thing as finishing a tour, which is tracked separately.
    expect(state.completedTours).toEqual([]);
    expect(state.needs.trust).toBeCloseTo(42, 5);
    expect(state.needs.energy).toBeCloseTo(72, 5);
    expect(state.needs.affection).toBeCloseTo(50, 5);
    expect(state.lastUpdatedAt).toBe(NOW + 2 * HOUR);
    second.destroy();

    const capped = createPetStore({ storage, now: () => NOW + 40 * HOUR, offlineCapMs: HOUR });
    expect(capped.hydration.offlineMs).toBe(HOUR);
    capped.destroy();
  });

  it('does not age a paused pet while the tab is closed', () => {
    const storage = createMemoryStorage();
    saveSnapshot(storage, { ...defaultSnapshot(NOW), paused: true, energy: 40, affection: 30 });
    const store = createPetStore({ storage, now: () => NOW + 6 * HOUR });
    expect(store.hydration.offlineMs).toBe(0);
    expect(store.getState().needs.energy).toBe(40);
    expect(store.getState().needs.affection).toBe(30);
    // The clock still moves forward, so resuming cannot replay the missed hours at once.
    expect(store.getState().lastUpdatedAt).toBe(NOW + 6 * HOUR);
    store.destroy();
  });

  it('keeps working when storage itself is broken', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createPetStore({ storage: hostile, now: () => NOW });
    expect(store.storageAvailable).toBe(true);
    expect(store.hydration.existed).toBe(false);
    expect(store.hydration.recovered).toBe(true);

    store.dispatch({ type: 'EVENT', kind: 'PETTED', at: NOW });
    expect(() => store.flush()).not.toThrow();
    expect(store.getState().needs.affection).toBe(72);
    store.destroy();
  });
});
