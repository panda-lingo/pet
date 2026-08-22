import type { GuideTour } from './guide/types.js';
import type { Mood } from './types.js';

/**
 * Copy tone from the brand guide: short, warm, confident, encouraging. No exclamation
 * marks stacked up, no "revolutionary AI", no gamified praise.
 */
export const MOOD_LINES: Record<Mood, readonly string[]> = {
  neutral: ['Ready when you are.', 'Take your time.', 'A quiet minute is enough to begin.'],
  happy: ['That sounded good.', 'Your voice is finding its rhythm.', 'Small steps. Big progress.'],
  excited: ['Shall we keep going?', 'One more sentence, then tea.', 'You are on a roll.'],
  curious: ['Something new here?', 'Shall I show you around?', 'I was just looking at this.'],
  tired: ['Rest is part of learning.', 'We can pick this up later.', 'A short pause, then we continue.'],
  hungry: ['Time for a snack and a sentence.', 'Tea first. Then practice.', 'A little bamboo would help.'],
  lonely: ['I kept your seat warm.', 'Good to see you again.', 'It is nicer when you are here.'],
};

export const INTERACTION_LINES = {
  greetingFirstVisit: 'Hello. I am Panda — your speaking companion.',
  greetingReturning: 'Welcome back. Shall we speak?',
  greetingLongAbsence: 'It has been a while. Let us start gently.',
  petted: 'That is lovely, thank you.',
  tapped: 'Here whenever you need me.',
  hidden: 'I will wait quietly.',
  tourComplete: 'That is the whole tour. Your voice deserves the world.',
  tourExited: 'Stopped. Ask me again any time.',
  targetMissing: 'I cannot find that part of the page yet.',
} as const;

export function moodLine(mood: Mood, pick: number): string {
  const lines = MOOD_LINES[mood];
  const index = Math.abs(Math.floor(pick)) % lines.length;
  return lines[index] ?? INTERACTION_LINES.tapped;
}

/**
 * The onboarding tour.
 *
 * Step 4 lives on the `#speak` route and its target mounts after navigation, which is
 * exactly the asynchronous case the brief asks the engine to survive.
 */
export const WELCOME_TOUR: GuideTour = {
  id: 'welcome',
  title: 'A quiet tour',
  steps: [
    {
      id: 'nav',
      target: 'nav-speak',
      message: 'Speak is where your conversations live. Everything else can wait.',
      preferredPlacement: 'below',
      action: 'point',
      completion: { type: 'manual' },
    },
    {
      id: 'hero',
      target: 'hero-cta',
      message: 'Start here when you are ready. No script — just a conversation.',
      preferredPlacement: 'auto',
      action: 'point',
      autoScroll: true,
      completion: { type: 'target-click' },
    },
    {
      id: 'features',
      target: 'features',
      message: 'Four quiet promises. Read them at your own pace.',
      preferredPlacement: 'above',
      action: 'look',
      autoScroll: true,
      completion: { type: 'manual' },
    },
    {
      id: 'practice',
      route: '#speak',
      target: 'practice-input',
      message: 'Try one sentence. I will listen, not judge.',
      preferredPlacement: 'right',
      action: 'sit',
      autoScroll: true,
      completion: { type: 'site-event', event: 'practice-submitted' },
      targetTimeoutMs: 3_000,
    },
    {
      id: 'progress',
      route: '#home',
      target: 'progress-stats',
      message: 'Progress you can feel. Small steps, every day.',
      preferredPlacement: 'left',
      action: 'look',
      autoScroll: true,
      completion: { type: 'manual' },
    },
    {
      id: 'join',
      target: 'join-cta',
      message: 'Whenever you are ready, I will be right here.',
      preferredPlacement: 'auto',
      action: 'celebrate',
      autoScroll: true,
      completion: { type: 'manual' },
    },
  ],
};

/**
 * Diagnostics tour used by the demo panel and the e2e suite: the first target does not
 * exist, so the Retry / Skip / Exit path is reachable on purpose.
 */
export const MISSING_TARGET_TOUR: GuideTour = {
  id: 'diagnostics',
  title: 'Missing target check',
  steps: [
    {
      id: 'ghost',
      target: 'this-target-does-not-exist',
      message: 'This step points at nothing, to prove the tour still recovers.',
      preferredPlacement: 'auto',
      action: 'look',
      completion: { type: 'manual' },
      targetTimeoutMs: 900,
    },
    {
      id: 'recovered',
      target: 'progress-stats',
      message: 'Recovered. Skipping a broken step never blocks the tour.',
      preferredPlacement: 'left',
      action: 'wave',
      autoScroll: true,
      completion: { type: 'manual' },
    },
  ],
};

export const TOURS: readonly GuideTour[] = [WELCOME_TOUR, MISSING_TARGET_TOUR];
