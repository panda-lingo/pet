import { addXp, XP_PER_EVENT } from './lifecycle.js';
import { deriveMood, pruneEvents } from './mood.js';
import { applyNeedEvent, clampNeeds, driftNeeds } from './needs.js';
import { defaultSnapshot } from './snapshot.js';
import type {
  Activity,
  PetEvent,
  PetEventKind,
  PetPreferences,
  PetSnapshot,
  PetState,
} from './types.js';
import { clamp01 } from './types.js';

export type PetAction =
  | { type: 'TICK'; now: number }
  | { type: 'EVENT'; kind: PetEventKind; at: number; weight?: number }
  | { type: 'SET_ACTIVITY'; activity: Activity }
  | { type: 'SET_PREFERENCES'; patch: Partial<PetPreferences>; now: number }
  | { type: 'TOUR_COMPLETED'; id: string; at: number }
  | { type: 'RESET'; now: number };

export function stateFromSnapshot(snapshot: PetSnapshot, now: number): PetState {
  const needs = clampNeeds({
    energy: snapshot.energy,
    hunger: snapshot.hunger,
    affection: snapshot.affection,
    curiosity: snapshot.curiosity,
    trust: snapshot.trust,
  });
  const mood = deriveMood({ needs, recentEvents: [], now });
  return {
    needs,
    mood: mood.mood,
    moodChangedAt: now,
    activity: 'idle',
    stage: snapshot.stage,
    stageProgress: clamp01(snapshot.stageProgress),
    xp: snapshot.xp,
    bornAt: snapshot.bornAt,
    lastUpdatedAt: snapshot.lastUpdatedAt,
    lastInteractionAt: snapshot.lastUpdatedAt,
    completedTours: [...snapshot.completedTours],
    unlockedActions: [...snapshot.unlockedActions],
    preferences: {
      hidden: snapshot.hidden,
      paused: snapshot.paused,
      muted: snapshot.muted,
      motionOverride: snapshot.motionOverride,
    },
    recentEvents: [],
  };
}

export function toSnapshot(state: PetState): PetSnapshot {
  const base = defaultSnapshot(state.lastUpdatedAt);
  return {
    ...base,
    bornAt: state.bornAt,
    lastUpdatedAt: state.lastUpdatedAt,
    stage: state.stage,
    stageProgress: state.stageProgress,
    xp: state.xp,
    energy: state.needs.energy,
    hunger: state.needs.hunger,
    affection: state.needs.affection,
    curiosity: state.needs.curiosity,
    trust: state.needs.trust,
    completedTours: [...state.completedTours],
    unlockedActions: [...state.unlockedActions],
    hidden: state.preferences.hidden,
    paused: state.preferences.paused,
    muted: state.preferences.muted,
    motionOverride: state.preferences.motionOverride,
  };
}

function withMood(state: PetState, needs: PetState['needs'], events: PetEvent[], now: number): PetState {
  const mood = deriveMood({
    needs,
    recentEvents: events,
    now,
    current: state.mood,
    moodChangedAt: state.moodChangedAt,
  });
  return { ...state, needs, recentEvents: events, mood: mood.mood, moodChangedAt: mood.moodChangedAt };
}

export function petReducer(state: PetState, action: PetAction): PetState {
  switch (action.type) {
    case 'TICK': {
      const elapsed = action.now - state.lastUpdatedAt;
      if (elapsed <= 0) return state;
      // A paused pet stops living: needs must not drift behind the user's back.
      const needs = state.preferences.paused
        ? state.needs
        : driftNeeds(state.needs, elapsed, { sleeping: state.activity === 'sleeping' });
      const events = pruneEvents(state.recentEvents, action.now);
      const next = withMood(state, needs, events, action.now);
      return { ...next, lastUpdatedAt: action.now };
    }
    case 'EVENT': {
      const event: PetEvent = { kind: action.kind, at: action.at, weight: action.weight ?? 1 };
      const needs = applyNeedEvent(state.needs, event);
      const gained = addXp(state.xp, XP_PER_EVENT[action.kind] * (event.weight ?? 1));
      const events = pruneEvents([...state.recentEvents, event], action.at);
      const next = withMood(state, needs, events, action.at);
      return {
        ...next,
        xp: gained.xp,
        stage: gained.stage,
        stageProgress: gained.stageProgress,
        lastInteractionAt: action.at,
        lastUpdatedAt: Math.max(state.lastUpdatedAt, action.at),
      };
    }
    case 'SET_ACTIVITY':
      return state.activity === action.activity ? state : { ...state, activity: action.activity };
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.patch },
        lastUpdatedAt: Math.max(state.lastUpdatedAt, action.now),
      };
    case 'TOUR_COMPLETED': {
      if (state.completedTours.includes(action.id)) return state;
      return { ...state, completedTours: [...state.completedTours, action.id] };
    }
    case 'RESET':
      return stateFromSnapshot(defaultSnapshot(action.now), action.now);
    default:
      return state;
  }
}
