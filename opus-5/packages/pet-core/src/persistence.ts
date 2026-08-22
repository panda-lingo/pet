import { driftNeeds } from './needs.js';
import { defaultSnapshot, validateSnapshot } from './snapshot.js';
import type { PetSnapshot } from './types.js';

export const STORAGE_KEY = 'pandalingo.pet';

/** Offline drift is capped so a two-week absence does not return a starving panda. */
export const OFFLINE_CAP_MS = 8 * 3_600_000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * Returns `null` during server rendering, and also when the browser refuses storage
 * (private mode, `file://` origins, blocked cookies). Callers must handle `null` and
 * degrade to an in-memory snapshot instead of crashing the page.
 */
export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    const probe = '__pandalingo_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface LoadResult {
  snapshot: PetSnapshot;
  /** True when stored data existed but had to be repaired or migrated. */
  recovered: boolean;
  existed: boolean;
}

export function loadSnapshot(storage: StorageLike | null, now: number): LoadResult {
  if (!storage) return { snapshot: defaultSnapshot(now), recovered: false, existed: false };
  let rawText: string | null = null;
  try {
    rawText = storage.getItem(STORAGE_KEY);
  } catch {
    return { snapshot: defaultSnapshot(now), recovered: true, existed: false };
  }
  if (rawText === null) return { snapshot: defaultSnapshot(now), recovered: false, existed: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Malformed JSON: start fresh rather than leaving the feature broken forever.
    return { snapshot: defaultSnapshot(now), recovered: true, existed: true };
  }

  const snapshot = validateSnapshot(parsed, now);
  const wasCurrent =
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as { schemaVersion?: unknown }).schemaVersion === snapshot.schemaVersion;
  return { snapshot, recovered: !wasCurrent, existed: true };
}

export function saveSnapshot(storage: StorageLike | null, snapshot: PetSnapshot): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function clearSnapshot(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do: the reset is best-effort */
  }
}

export interface DebouncedSaver {
  save(snapshot: PetSnapshot): void;
  flush(): void;
  dispose(): void;
}

export interface DebounceOptions {
  delayMs?: number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}

/** Coalesces writes; every pending write is either flushed or cancelled on dispose. */
export function createDebouncedSaver(
  storage: StorageLike | null,
  options: DebounceOptions = {},
): DebouncedSaver {
  const delayMs = options.delayMs ?? 400;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let handle: unknown = null;
  let pending: PetSnapshot | null = null;

  const write = () => {
    handle = null;
    if (!pending) return;
    saveSnapshot(storage, pending);
    pending = null;
  };

  return {
    save(snapshot) {
      pending = snapshot;
      if (handle !== null) return;
      handle = schedule(write, delayMs);
    },
    flush() {
      if (handle !== null) cancel(handle);
      write();
    },
    dispose() {
      if (handle !== null) cancel(handle);
      handle = null;
      pending = null;
    },
  };
}

export interface OfflineResult {
  snapshot: PetSnapshot;
  elapsedMs: number;
  appliedMs: number;
}

/** Advances needs for time spent away, capped by `OFFLINE_CAP_MS`. */
export function applyOfflineProgress(
  snapshot: PetSnapshot,
  now: number,
  capMs: number = OFFLINE_CAP_MS,
): OfflineResult {
  const elapsedMs = Math.max(0, now - snapshot.lastUpdatedAt);
  const appliedMs = Math.min(elapsedMs, capMs);
  if (appliedMs === 0) return { snapshot: { ...snapshot, lastUpdatedAt: now }, elapsedMs, appliedMs };
  const drifted = driftNeeds(
    {
      energy: snapshot.energy,
      hunger: snapshot.hunger,
      affection: snapshot.affection,
      curiosity: snapshot.curiosity,
      trust: snapshot.trust,
    },
    appliedMs,
  );
  return {
    snapshot: { ...snapshot, ...drifted, lastUpdatedAt: now },
    elapsedMs,
    appliedMs,
  };
}
