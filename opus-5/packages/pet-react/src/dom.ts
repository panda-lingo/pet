import { targetSelectorSafe, type Rect } from '@pet/core';

/** DOM plumbing kept out of the components so it can be unit-tested in jsdom. */

export function findTarget(target: string, root: Document | HTMLElement = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(targetSelectorSafe(target));
}

export function rectOf(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

/** A target that exists but has no box yet (still laying out) is not usable. */
export function usableRect(element: HTMLElement | null): Rect | null {
  if (!element || !element.isConnected) return null;
  const rect = rectOf(element);
  if (rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

export interface WaitOptions {
  root?: Document | HTMLElement;
  /** Injected in tests; defaults to the real timers. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/**
 * Bounded wait for a target that may mount after navigation. Resolves `null` on timeout
 * instead of hanging, which is what lets the guide engine offer Retry / Skip / Exit.
 */
export function waitForTargetRect(target: string, timeoutMs: number, options: WaitOptions = {}): Promise<Rect | null> {
  const root = options.root ?? document;
  const immediate = usableRect(findTarget(target, root));
  if (immediate) return Promise.resolve(immediate);

  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  return new Promise<Rect | null>((resolve) => {
    let done = false;
    let observer: MutationObserver | null = null;
    let poll: unknown = null;
    let deadline: unknown = null;

    const finish = (rect: Rect | null) => {
      if (done) return;
      done = true;
      observer?.disconnect();
      if (poll !== null) clearTimer(poll);
      if (deadline !== null) clearTimer(deadline);
      resolve(rect);
    };

    const attempt = () => {
      const rect = usableRect(findTarget(target, root));
      if (rect) finish(rect);
    };

    // Two independent triggers: DOM mutations catch a late mount, the poll catches an
    // element whose box only appears after layout or an image load.
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(attempt);
      const host = root instanceof Document ? root.documentElement : root;
      if (host) observer.observe(host, { childList: true, subtree: true, attributes: true });
    }
    const tick = () => {
      attempt();
      if (!done) poll = setTimer(tick, 100);
    };
    poll = setTimer(tick, 100);
    deadline = setTimer(() => finish(null), Math.max(0, timeoutMs));
  });
}

export function scrollTargetIntoView(target: string, smooth: boolean): void {
  const element = findTarget(target);
  if (!element) return;
  element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' });
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True while the user is typing: the pet must hold still and only blink. */
export function isTypingElement(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (node.isContentEditable) return true;
  if (!TYPING_TAGS.has(node.tagName)) return false;
  if (node instanceof HTMLInputElement) {
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file'].includes(node.type);
  }
  return true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `matchMedia` change subscription that also copes with the legacy Safari API. */
export function onReducedMotionChange(handler: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (event: MediaQueryListEvent) => handler(event.matches);
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  const legacy = query as MediaQueryList & { addListener?: (fn: (e: MediaQueryListEvent) => void) => void; removeListener?: (fn: (e: MediaQueryListEvent) => void) => void };
  legacy.addListener?.(listener);
  return () => legacy.removeListener?.(listener);
}

export function viewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Rects the pet should not cover: the focused field and the element it points at. */
export function avoidRects(extra: readonly (Rect | null)[] = []): Rect[] {
  const rects: Rect[] = [];
  const focused = typeof document === 'undefined' ? null : document.activeElement;
  if (focused instanceof HTMLElement && isTypingElement(focused)) {
    const rect = usableRect(focused);
    if (rect) rects.push(rect);
  }
  for (const rect of extra) if (rect) rects.push(rect);
  return rects;
}
