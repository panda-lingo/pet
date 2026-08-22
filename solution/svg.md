You are a senior TypeScript frontend engineer, SVG illustrator, interaction
designer, and web animation engineer working in an existing production
repository.

OBJECTIVE

Implement an interactive 2D website pet entirely from code.

The pet must be rendered as an inline layered SVG React component. Do not use
external character artwork, image-generation APIs, PNG sprite sheets, GLB
files, Lottie files, or Rive files.

The complete first implementation must be reproducible from source code alone.

PET DESIGN

Species: [CAT / DOG / FOX / CUSTOM]
Personality: [FRIENDLY, CURIOUS, CALM, PLAYFUL]
Primary color: [COLOR]
Secondary color: [COLOR]
Accent color: [COLOR]
Visual style: polished modern product mascot, soft geometric shapes, expressive
face, clean outlines, subtle gradients, friendly rather than photorealistic.

The pet should look suitable for a professional SaaS or consumer website.
Avoid generic emoji styling and avoid copying any existing copyrighted
character.

CORE REQUIREMENTS

The pet must:

1. Render as inline SVG.
2. Use separate SVG groups for body parts.
3. Animate breathing, blinking, pupils, head, ears, tail, body, and paws.
4. Follow the pointer subtly with its eyes and head.
5. React to click, tap, hover, and a petting drag gesture.
6. Move around the browser viewport.
7. Walk beside configured website elements.
8. Point toward or look toward website elements.
9. Display accessible HTML speech bubbles.
10. Highlight website targets during tutorials.
11. Maintain mood, needs, XP, affection, and life stage.
12. Persist state safely in localStorage.
13. Respect reduced-motion, mute, pause, and hide preferences.
14. Avoid blocking normal website interactions.
15. Work without a backend.

REPOSITORY ANALYSIS

Before modifying code:

1. Inspect package.json, lockfile, TypeScript settings, React version, router,
   styling system, test framework, application entry points, SSR setup, and
   existing state management.
2. Reuse existing libraries where appropriate.
3. Do not replace the existing architecture.
4. Do not add a large rendering library unless the repository already uses one.
5. Prefer browser APIs, CSS transforms, and inline SVG.
6. Identify code that must be client-only.
7. Produce a concise implementation plan and then implement it.

NO EXTERNAL ART ASSETS

All pet artwork must be authored as SVG JSX source.

Create semantic SVG groups for:

- shadow
- tail
- body
- back legs
- front legs
- head
- left ear
- right ear
- muzzle
- left eye
- right eye
- left pupil
- right pupil
- eyebrows
- nose
- mouth
- optional cheek markings

Use reusable components rather than placing the entire drawing in one large
component.

Every animated group must have a documented transform origin.

Use SVG viewBox coordinates and make the artwork scale without losing quality.

Do not embed base64 images inside the SVG.

VISUAL QUALITY

Create a polished character using:

- balanced proportions
- consistent line weights
- subtle gradients
- soft shadow
- restrained highlights
- readable facial expressions
- smooth curves
- coherent brand colors
- adequate contrast
- no excessive visual detail

The pet must remain readable when displayed between 120 and 240 CSS pixels.

Create a development gallery route or Storybook-style component showing:

- baby neutral
- young happy
- adult neutral
- curious
- tired
- hungry
- lonely
- excited
- eyes closed
- pointing pose
- walking pose

ANIMATION ARCHITECTURE

Create one animation controller responsible for all pet motion.

Use:

- CSS transforms for persistent looping motion
- Web Animations API for one-shot reactions
- requestAnimationFrame only for pointer tracking or active movement
- CSS custom properties for frequently updated transform values

Do not update React state on every animation frame.

Animated parts should primarily use transform and opacity.

Implement:

1. Idle breathing with subtle body scale and vertical movement.
2. Irregular blinking with randomized intervals and bounded timers.
3. Small random eye saccades.
4. Clamped pupil tracking.
5. Delayed and clamped head tracking.
6. Occasional ear twitch.
7. Mood-dependent tail motion.
8. Weight shifting during idle.
9. Squash and stretch for click reactions.
10. Anticipation and settling for jumps.
11. Alternating paw motion for walking.
12. A pointing or target-looking pose for guidance.
13. Sleeping motion with slow breathing.
14. A speaking motion that does not require audio.

Use weighted idle actions with cooldowns so the pet does not repeat the same
action mechanically.

BEHAVIOR MODEL

Implement these typed domains:

LifeStage:
- baby
- young
- adult

Mood:
- neutral
- happy
- excited
- curious
- tired
- hungry
- lonely

Activity:
- idle
- walking
- guiding
- reacting
- playing
- sleeping

Needs:
- energy
- hunger
- affection
- curiosity
- trust

All need values must be validated and clamped to 0–100.

Mood should be derived from needs and recent events rather than freely assigned
by UI components.

Add hysteresis so the mood does not rapidly switch near thresholds.

Use the repository's existing state system if suitable. Otherwise implement a
strictly typed reducer and separate business logic from React components.

LIFE STAGES

Implement life stages with one shared SVG character and configurable
proportions.

Stage appearance should be parameterized by:

- head scale
- body scale
- eye scale
- ear scale
- leg length
- tail size
- overall height
- optional marking visibility

Baby should have a larger head-to-body ratio, larger eyes, and shorter legs.

Young should have intermediate proportions.

Adult should have balanced mature proportions.

Use a short crossfade or transform transition when changing stages. Under
reduced-motion preferences, change immediately.

PET OVERLAY

Create a fixed full-screen overlay root with pointer-events: none.

Only these elements may use pointer-events: auto:

- visible pet body
- speech bubble controls
- mute/pause/hide controls

The pet must never prevent clicking, scrolling, typing, selecting text, or
interacting with the page outside its visible body.

Position the pet using translate3d on one outer positioner element.

Do not animate left and top continuously.

WEBSITE GUIDE

Targets must use stable attributes:

data-pet-target="target-name"

Create a typed guide configuration with:

- id
- optional route
- target selector
- message
- preferred placement
- pet action
- optional auto-scroll
- completion condition

Completion conditions:

- manual Next
- target click
- named site event

For each guide step:

1. Navigate when necessary.
2. Wait for asynchronously rendered targets with a bounded timeout.
3. Read target.getBoundingClientRect().
4. Calculate left, right, above, and below placement candidates.
5. Keep the pet inside the visual viewport.
6. Avoid obscuring the target.
7. Avoid covering the currently focused form control.
8. Move the pet beside the target.
9. Play the walking animation during movement.
10. Stop and enter the pointing or looking pose.
11. Display an accessible HTML speech bubble.
12. Wait for the configured completion event.

A missing target must never deadlock the tutorial. Provide Skip, Retry, and Exit
behavior.

SPEECH BUBBLE

Render speech bubbles in HTML, not inside SVG.

Use:

- role="status"
- aria-live="polite"
- readable text size
- viewport-aware placement
- Next, Back, Skip, and Exit buttons when applicable

Do not trap focus.

INTERACTIONS

Implement:

1. Click or tap:
   - short squash-and-stretch reaction
   - increase affection with a cooldown

2. Hover:
   - pet looks toward the pointer
   - optional subtle tail response

3. Petting gesture:
   - begin only when pointer-down starts on the pet
   - use pointer capture
   - accumulate pointer movement distance
   - distinguish petting from clicking
   - emit one PETTED event after a threshold
   - apply diminishing rewards during repeated gestures

4. User return:
   - compare last interaction time
   - play an appropriate greeting
   - do not show the greeting on every page navigation

5. Typing awareness:
   - reduce distracting movement while an input, textarea, or contenteditable
     element has focus

PERSISTENCE

Create a schema-versioned snapshot containing:

- schemaVersion
- bornAt
- lastUpdatedAt
- stage
- stageProgress
- xp
- energy
- hunger
- affection
- curiosity
- trust
- completedTours
- unlockedActions
- hidden preference
- paused preference
- muted preference

Requirements:

- validate loaded data
- clamp numerical values
- recover from malformed JSON
- add migration support
- debounce writes
- cap offline progression
- never access localStorage during server rendering
- provide a reset control

PERFORMANCE

- Lazy-load the pet feature.
- Do not block initial page rendering.
- Do not use Canvas or WebGL for the initial implementation.
- Avoid per-frame React renders.
- Pause active animation work while document.visibilityState is hidden.
- Remove all timers and event listeners on cleanup.
- Use passive listeners where appropriate.
- Recalculate guide placement using throttled requestAnimationFrame callbacks.
- Keep the SVG reasonably small and componentized.

ACCESSIBILITY

- Respect prefers-reduced-motion.
- Reduced-motion mode must disable walking transitions, jumping, continuous
  head tracking, and unnecessary idle movement.
- Provide Pause, Hide, and Reset controls.
- Do not autoplay audio.
- Important website functionality must remain usable without the pet.
- The pet must never be the only way to navigate or complete a form.
- Provide descriptive accessible names for controls.
- Do not produce rapid flashing.

TESTS

Add tests for:

1. Mood derivation.
2. Mood hysteresis.
3. Need-value clamping.
4. Life-stage progression.
5. Persistence validation and migration.
6. Offline elapsed-time calculations.
7. Guide target timeout.
8. Guide placement clamping.
9. Target-click advancement.
10. Named-site-event advancement.
11. Pet hide and pause behavior.
12. Reduced-motion behavior.

Add a Playwright smoke test where supported:

1. Load the page.
2. Verify the pet appears.
3. Click the pet and verify a reaction.
4. Start one guide step.
5. Verify the pet moves beside the target.
6. Click the actual website target.
7. Verify the guide advances.
8. Hide the pet.
9. Reload and verify the hidden preference persists.

VISUAL VERIFICATION

When browser automation is available:

1. Run the application.
2. Capture screenshots at desktop and mobile viewport sizes.
3. Inspect character proportions, clipping, overlapping, speech-bubble
   placement, and target visibility.
4. Iterate on the SVG and CSS until the character looks polished.
5. Capture the development gallery states.
6. Do not claim visual verification unless screenshots were actually produced.

QUALITY RULES

- Strict TypeScript.
- No unexplained any types.
- No unbounded timers.
- No generated CSS selectors for guide targets.
- No unrelated refactors.
- No external visual assets.
- No emoji used as the final pet artwork.
- No per-frame setState calls.
- No console errors in production.
- Match repository conventions.
- Comment architectural decisions, not obvious syntax.

ACCEPTANCE CRITERIA

1. The pet artwork is entirely represented by repository SVG/TSX/CSS source.
2. No external pet image or animation asset is required.
3. The pet appears in a small fixed overlay.
4. The rest of the page remains normally clickable and scrollable.
5. The pet breathes, blinks, tracks the pointer, and performs idle actions.
6. Clicking and petting trigger visible reactions.
7. Mood visibly affects the eyes, mouth, ears, body, and tail.
8. Baby, young, and adult stages have visibly different proportions.
9. The pet can move beside a real data-pet-target element.
10. The pet can point toward or look toward that element.
11. Guide speech is rendered as accessible HTML.
12. State and preferences survive reload.
13. Reduced-motion behavior works.
14. Typecheck, lint, tests, and production build pass.

FINAL REPORT

After implementation, report:

1. Architecture implemented.
2. Files created or changed.
3. Dependencies added and why.
4. Commands actually executed.
5. Test and build results.
6. Screenshots actually captured.
7. Visual compromises or remaining polish work.
8. Any acceptance criteria not completed.

Do not claim that commands, screenshots, tests, or visual checks succeeded unless
they were actually performed.
