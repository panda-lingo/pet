import {
  applyOfflineProgress,
  createDebouncedSaver,
  getBrowserStorage,
  loadSnapshot,
  type OfflineResult,
  type StorageLike,
} from './persistence.js';
import { petReducer, stateFromSnapshot, toSnapshot, type PetAction } from './store.js';
import type { PetSnapshot, PetState } from './types.js';

export interface PetStoreOptions {
  /** Pass `null` to run entirely in memory (server rendering, blocked storage, tests). */
  storage?: StorageLike | null;
  now?: () => number;
  offlineCapMs?: number;
  saveDelayMs?: number;
}

export interface PetStore {
  getState(): PetState;
  dispatch(action: PetAction): void;
  subscribe(listener: () => void): () => void;
  /** Writes immediately, bypassing the debounce (used on `pagehide`). */
  flush(): void;
  destroy(): void;
  readonly storageAvailable: boolean;
  readonly hydration: { existed: boolean; recovered: boolean; offlineMs: number };
}

/**
 * A paused pet stops living offline as well as online, mirroring the `TICK` branch of the
 * reducer. Without this the catch-up drift would undo the pause the moment the tab reopens.
 */
function catchUp(snapshot: PetSnapshot, now: number, capMs: number | undefined): OfflineResult {
  if (!snapshot.paused) return applyOfflineProgress(snapshot, now, capMs);
  return {
    snapshot: { ...snapshot, lastUpdatedAt: now },
    elapsedMs: Math.max(0, now - snapshot.lastUpdatedAt),
    appliedMs: 0,
  };
}

/**
 * Owns hydration, the reducer, subscriptions and debounced persistence.
 * Deliberately framework-free: React binds to it through `useSyncExternalStore`.
 */
export function createPetStore(options: PetStoreOptions = {}): PetStore {
  const now = options.now ?? (() => Date.now());
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const startedAt = now();

  const loaded = loadSnapshot(storage, startedAt);
  const offline = catchUp(loaded.snapshot, startedAt, options.offlineCapMs);
  let state = stateFromSnapshot(offline.snapshot, startedAt);

  const listeners = new Set<() => void>();
  const saver = createDebouncedSaver(storage, { delayMs: options.saveDelayMs ?? 400 });
  let disposed = false;

  const persist = (snapshot: PetSnapshot) => {
    if (!disposed) saver.save(snapshot);
  };

  return {
    getState: () => state,
    dispatch(action) {
      if (disposed) return;
      const next = petReducer(state, action);
      if (next === state) return;
      state = next;
      persist(toSnapshot(state));
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    flush() {
      saver.save(toSnapshot(state));
      saver.flush();
    },
    destroy() {
      disposed = true;
      saver.flush();
      saver.dispose();
      listeners.clear();
    },
    storageAvailable: storage !== null,
    hydration: { existed: loaded.existed, recovered: loaded.recovered, offlineMs: offline.appliedMs },
  };
}
