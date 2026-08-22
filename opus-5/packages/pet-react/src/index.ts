export { PetProvider, type PetProviderProps } from './PetProvider.js';
export { PetOverlay, type PetOverlayProps } from './PetOverlay.js';
export { PetControls } from './PetControls.js';
export { SpeechBubble } from './SpeechBubble.js';
export { TargetHighlight } from './TargetHighlight.js';
export { useGestures, type PetGestureHandlers } from './useGestures.js';
export { useGuide, type GuideView } from './useGuide.js';
export {
  PetContext,
  usePet,
  type PetActions,
  type PetContextValue,
  type PetSpeech,
} from './context.js';
export {
  avoidRects,
  findTarget,
  isTypingElement,
  onReducedMotionChange,
  prefersReducedMotion,
  rectOf,
  scrollTargetIntoView,
  usableRect,
  viewportSize,
  waitForTargetRect,
  type WaitOptions,
} from './dom.js';
