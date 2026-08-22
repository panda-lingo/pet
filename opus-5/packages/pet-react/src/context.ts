import { createContext, useContext } from 'react';
import type {
  Breakpoint,
  GuideEngine,
  GuideState,
  MotionCapabilities,
  MotionProfile,
  PetPose,
  PetRuntime,
  PetState,
  PetStore,
  PoseEngine,
  ReactionKind,
  Rect,
} from '@pet/core';

/** What the bubble is currently saying, and why. */
export interface PetSpeech {
  text: string;
  source: 'greeting' | 'reaction' | 'idle' | 'guide';
}

export interface PetActions {
  /** Transient line; guide messages are not routed through here. */
  say(text: string, holdMs?: number): void;
  silence(): void;
  trigger(kind: ReactionKind): void;
  /** A tap on the pet: XP, a nod, and a mood-appropriate line. */
  tap(): void;
  /** One petting payout from the gesture tracker (0–1 weight). */
  petted(weight: number): void;
  /** Live petting intensity for the renderer; does not touch the store. */
  setPetting(intensity: number): void;
  setHovered(hovered: boolean): void;
  setPose(pose: PetPose): void;
  setMotionOverride(profile: MotionProfile | null): void;
  setHidden(hidden: boolean): void;
  setPaused(paused: boolean): void;
  setMuted(muted: boolean): void;
  reset(): void;
  startTour(tourId: string): void;
  /** Moves the pet in viewport coordinates; resolves when the travel finishes. */
  moveTo(x: number, y: number): Promise<void>;
  returnToDock(): Promise<void>;
}

export interface PetContextValue {
  store: PetStore;
  runtime: PetRuntime;
  /** Shared by both renderers: one engine, one snapshot object, one set of timers. */
  engine: PoseEngine;
  state: PetState;
  motion: MotionProfile;
  capabilities: MotionCapabilities;
  breakpoint: Breakpoint;
  size: number;
  position: { x: number; y: number };
  engaged: boolean;
  speech: PetSpeech | null;
  bubbleSide: 'left' | 'right';
  guide: GuideEngine;
  guideState: GuideState;
  highlight: Rect | null;
  tours: readonly { id: string; title: string }[];
  storageAvailable: boolean;
  actions: PetActions;
}

export const PetContext = createContext<PetContextValue | null>(null);

export function usePet(): PetContextValue {
  const value = useContext(PetContext);
  if (!value) throw new Error('usePet() must be used inside <PetProvider>.');
  return value;
}
