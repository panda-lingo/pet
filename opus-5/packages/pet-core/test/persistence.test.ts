import { describe, expect, it } from 'vitest';
import {
  applyOfflineProgress,
  clearSnapshot,
  createDebouncedSaver,
  createMemoryStorage,
  loadSnapshot,
  OFFLINE_CAP_MS,
  saveSnapshot,
  STORAGE_KEY,
  type StorageLike,
} from '../src/persistence.js';
import { defaultSnapshot, migrateSnapshot, SCHEMA_VERSION, validateSnapshot } from '../src/snapshot.js';
import { STAGE_XP } from '../src/lifecycle.js';
import { NEED_DRIFT_PER_HOUR } from '../src/needs.js';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

describe('snapshot validation and migration', () => {
  it('falls back to a fresh snapshot for anything unusable', () => {
    for (const input of [null, undefined, 42, 'nope', []]) {
      expect(validateSnapshot(input, NOW)).toEqual(defaultSnapshot(NOW));
    }
  });

  it('migrates a v1 record with nested needs and no XP', () => {
    const restored = validateSnapshot(
      {
        schemaVersion: 1,
        stage: 'young',
        needs: { energy: 50, hunger: 60, affection: 70 },
        bornAt: NOW - 10 * HOUR,
        lastUpdatedAt: NOW - HOUR,
      },
      NOW,
    );
    expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
    expect(restored.energy).toBe(50);
    expect(restored.hunger).toBe(60);
    expect(restored.affection).toBe(70);
    expect(restored.curiosity).toBe(60);
    expect(restored.trust).toBe(20);
    // The earned stage survives: XP is lifted to that stage's floor rather than reset.
    expect(restored.xp).toBe(STAGE_XP.young);
    expect(restored.stage).toBe('young');
    expect(restored.motionOverride).toBeNull();
    expect(restored.unlockedActions).toEqual(['wave']);
  });

  it('renames v2 fields and keeps XP authoritative over a stale stage', () => {
    const restored = validateSnapshot(
      { schemaVersion: 2, xp: 600, stage: 'young', tours: ['welcome'], mute: true, hidden: true, bornAt: NOW - HOUR },
      NOW,
    );
    expect(restored.completedTours).toEqual(['welcome']);
    expect(restored.muted).toBe(true);
    expect(restored.hidden).toBe(true);
    expect(restored.stage).toBe('adult');
    const migrated = migrateSnapshot({ schemaVersion: 2, tours: [], mute: false });
    expect(migrated).not.toHaveProperty('tours');
    expect(migrated).not.toHaveProperty('mute');
  });

  it('clamps out-of-range values and rejects unknown enums', () => {
    const restored = validateSnapshot(
      {
        schemaVersion: SCHEMA_VERSION,
        energy: 999,
        hunger: -20,
        affection: 'nope',
        xp: -5,
        stage: 'ancient',
        stageProgress: 4,
        motionOverride: 'turbo',
        completedTours: ['a', 7, 'b'],
        muted: 'yes',
        bornAt: 0,
        lastUpdatedAt: NOW + 10 * 86_400_000,
      },
      NOW,
    );
    expect(restored.energy).toBe(100);
    expect(restored.hunger).toBe(0);
    expect(restored.affection).toBe(defaultSnapshot(NOW).affection);
    expect(restored.xp).toBe(0);
    expect(restored.stage).toBe('baby');
    expect(restored.stageProgress).toBe(1);
    expect(restored.motionOverride).toBeNull();
    expect(restored.completedTours).toEqual(['a', 'b']);
    expect(restored.muted).toBe(false);
    // A zero or far-future clock reading is replaced by "now".
    expect(restored.bornAt).toBe(NOW);
    expect(restored.lastUpdatedAt).toBe(NOW);
  });
});

describe('storage', () => {
  it('round-trips through storage without drift', () => {
    const storage = createMemoryStorage();
    const snapshot = { ...defaultSnapshot(NOW - HOUR), xp: 220, stage: 'young' as const, stageProgress: 0.2 };
    expect(saveSnapshot(storage, snapshot)).toBe(true);
    const loaded = loadSnapshot(storage, NOW);
    expect(loaded.existed).toBe(true);
    expect(loaded.recovered).toBe(false);
    expect(loaded.snapshot).toEqual(snapshot);
  });

  it('reports a fresh start when nothing is stored, and no storage at all', () => {
    const empty = loadSnapshot(createMemoryStorage(), NOW);
    expect(empty.existed).toBe(false);
    expect(empty.recovered).toBe(false);
    expect(loadSnapshot(null, NOW).snapshot).toEqual(defaultSnapshot(NOW));
    expect(saveSnapshot(null, defaultSnapshot(NOW))).toBe(false);
  });

  it('recovers from malformed JSON and from a storage that throws', () => {
    const storage = createMemoryStorage();
    storage.setItem(STORAGE_KEY, '{ this is not json');
    const broken = loadSnapshot(storage, NOW);
    expect(broken.existed).toBe(true);
    expect(broken.recovered).toBe(true);
    expect(broken.snapshot).toEqual(defaultSnapshot(NOW));

    const hostile: StorageLike = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {
        throw new Error('blocked');
      },
    };
    expect(loadSnapshot(hostile, NOW).recovered).toBe(true);
    expect(saveSnapshot(hostile, defaultSnapshot(NOW))).toBe(false);
    expect(() => clearSnapshot(hostile)).not.toThrow();
  });

  it('coalesces writes and honours flush and dispose', () => {
    const storage = createMemoryStorage();
    // A holder object rather than a `let`: the timer is assigned inside a callback, which
    // control-flow analysis cannot follow.
    const timer: { run: (() => void) | null } = { run: null };
    const saver = createDebouncedSaver(storage, {
      delayMs: 400,
      schedule: (fn) => {
        timer.run = fn;
        return 1;
      },
      cancel: () => {
        timer.run = null;
      },
    });

    saver.save({ ...defaultSnapshot(NOW), xp: 1 });
    saver.save({ ...defaultSnapshot(NOW), xp: 2 });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    timer.run?.();
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').xp).toBe(2);

    saver.save({ ...defaultSnapshot(NOW), xp: 3 });
    saver.flush();
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').xp).toBe(3);

    saver.save({ ...defaultSnapshot(NOW), xp: 4 });
    saver.dispose();
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').xp).toBe(3);
  });
});

describe('offline progress', () => {
  it('simulates elapsed time and caps a long absence', () => {
    const snapshot = defaultSnapshot(NOW - 48 * HOUR);
    const result = applyOfflineProgress(snapshot, NOW);
    expect(result.elapsedMs).toBe(48 * HOUR);
    expect(result.appliedMs).toBe(OFFLINE_CAP_MS);
    const hours = OFFLINE_CAP_MS / HOUR;
    expect(result.snapshot.energy).toBeCloseTo(snapshot.energy + NEED_DRIFT_PER_HOUR.awake.energy * hours, 5);
    expect(result.snapshot.hunger).toBeCloseTo(snapshot.hunger + NEED_DRIFT_PER_HOUR.awake.hunger * hours, 5);
    expect(result.snapshot.lastUpdatedAt).toBe(NOW);
  });

  it('accepts a custom cap and does nothing for a zero gap', () => {
    const snapshot = defaultSnapshot(NOW - 48 * HOUR);
    expect(applyOfflineProgress(snapshot, NOW, HOUR).appliedMs).toBe(HOUR);
    const fresh = applyOfflineProgress(defaultSnapshot(NOW), NOW);
    expect(fresh.appliedMs).toBe(0);
    expect(fresh.snapshot).toEqual(defaultSnapshot(NOW));
  });
});
