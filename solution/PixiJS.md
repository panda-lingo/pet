You are a senior TypeScript frontend engineer, PixiJS engineer, interaction
designer, and 2D character animator working inside an existing production
repository.

OBJECTIVE

Implement an interactive 2D website pet using PixiJS v8.

The first version must be generated entirely from source code. Do not require
PNG character artwork, sprite sheets, Rive files, Lottie files, GLB files, or
external image-generation APIs.

Use PixiJS Graphics, GraphicsContext, Container, masks, transforms, and simple
effects to create a polished vector-like product mascot.

ARCHITECTURE

Use:

- normal React or application code for state, persistence, and website guides
- direct PixiJS for rendering and frame-by-frame animation
- normal HTML/CSS for speech bubbles, controls, and target highlights

If the repository already uses @pixi/react and it is appropriate, it may be
used. Otherwise mount one direct PixiJS Application inside a React component.

Do not send frame-by-frame animation values through React state.

REPOSITORY ANALYSIS

Before modifying code:

1. Inspect package.json, lockfile, TypeScript configuration, framework version,
   router, styling system, state management, testing tools, SSR architecture,
   and application entry points.
2. Determine whether PixiJS is already installed.
3. Use stable versions compatible with the repository.
4. Do not replace existing application architecture.
5. Identify components that must be client-only.
6. Produce a concise implementation plan and then implement it.
7. Do not modify unrelated files.

PET DESIGN

Species: [CAT / DOG / FOX / CUSTOM]
Personality: [FRIENDLY / CURIOUS / PLAYFUL / CALM]
Primary color: [COLOR]
Secondary color: [COLOR]
Accent color: [COLOR]

Create a polished modern product mascot with:

- soft geometric shapes
- consistent outlines
- subtle gradients
- expressive eyes and eyebrows
- readable ears and tail
- clear silhouette
- friendly proportions
- no resemblance to an existing copyrighted character

The pet must remain readable between approximately 120 and 240 CSS pixels.

PIXIJS APPLICATION

Create one transparent PixiJS Application.

Requirements:

- transparent background
- auto density
- device resolution capped at 2
- configurable 30 or 60 FPS
- pause ticker while the document is hidden
- stop rendering when the pet is hidden
- clean destruction and listener removal
- no full-screen interactive canvas

Use a small fixed pet viewport, approximately 240–300 CSS pixels square.

Move the outer DOM viewport with translate3d rather than moving a full-screen
canvas.

INPUT AND CLICK-THROUGH

The canvas must not block website interactions through its transparent areas.

Default architecture:

- Pixi canvas uses pointer-events: none
- one or more tightly fitted DOM hit areas use pointer-events: auto
- DOM pointer coordinates are translated to pet-local coordinates
- events are consumed only when the pointer is actually inside the pet hit area

Support:

- pointerdown
- pointermove
- pointerup
- pointercancel
- click/tap
- hover
- petting drag gesture

Do not place a large transparent interactive rectangle over page controls.

PET SCENE GRAPH

Create semantic containers for:

- root
- shadow
- tail
- body
- back legs
- front legs
- paws
- head
- left ear
- right ear
- left eye
- right eye
- pupils
- eyebrows
- muzzle
- nose
- mouth
- effects

Document the pivot or transform origin for every animated body part.

Create geometry once using GraphicsContext. Do not clear and rebuild complex
Graphics objects every frame.

Reuse contexts where practical and destroy resources safely.

ANIMATION CONTROLLER

Create one authoritative PetAnimationController.

Implement:

1. breathing
2. irregular blinking
3. small eye saccades
4. clamped pointer-following pupils
5. delayed and clamped head tracking
6. ear twitch
7. mood-dependent tail movement
8. idle weight shifting
9. click squash-and-stretch
10. happy bounce
11. sad lowering pose
12. sleeping motion
13. alternating-leg walking
14. anticipation before jumping
15. settling after landing
16. pointing or target-looking pose
17. speaking mouth movement
18. small heart or sparkle particles

The animation loop must update Pixi object transforms directly.

Do not call React setState from the Pixi ticker.

Use delta time rather than assuming a fixed frame rate.

MOOD AND BEHAVIOR

Implement these types:

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

Need values must be clamped to 0–100.

Mood must be derived from needs and recent events.

Add hysteresis so mood does not rapidly switch near thresholds.

Business rules must remain outside PixiJS scene objects.

LIFE STAGES

Use shared code-generated artwork with parameterized proportions.

Parameters should include:

- head scale
- body scale
- eye scale
- ear scale
- leg length
- tail length
- overall scale
- movement speed

Baby:
- larger head and eyes
- shorter legs
- smaller body
- more energetic idle movement

Young:
- intermediate proportions

Adult:
- balanced proportions
- slightly slower and more controlled motion

WEIGHTED IDLE BEHAVIOR

Implement a weighted idle-action selector with cooldowns.

Possible actions:

- blink
- look around
- ear twitch
- tail wag
- stretch
- sit
- inspect pointer
- inspect nearby target
- yawn
- sleep

Weights must depend on mood, energy, current activity, recent actions, and page
context.

Do not select distracting idle actions while the user is typing or while a
guide step is active.

WEBSITE GUIDE

Website targets must use stable attributes:

data-pet-target="target-name"

Create a typed guide configuration supporting:

- id
- optional route
- target
- message
- preferred placement
- pet action
- optional auto-scroll
- manual completion
- target-click completion
- named-site-event completion

For every step:

1. Navigate when necessary.
2. Wait for asynchronously rendered targets using a bounded timeout.
3. Read target.getBoundingClientRect().
4. Evaluate left, right, above, and below pet positions.
5. Keep the pet and speech bubble inside the viewport.
6. Avoid covering the target.
7. Avoid covering the focused form field.
8. Move the outer pet viewport to the chosen position.
9. Play walking animation during movement.
10. Stop and look or point toward the target.
11. Show an accessible HTML speech bubble.
12. Wait for the configured completion event.

Missing targets must provide Retry, Skip, and Exit behavior and must not
deadlock the guide.

ACCESSIBILITY

Use normal HTML for:

- speech bubbles
- tutorial messages
- Next, Back, Skip, and Exit buttons
- Pause, Hide, and Reset controls
- aria-live announcements

Requirements:

- role="status"
- aria-live="polite"
- keyboard-accessible controls
- no focus trap
- no automatic audio
- no rapid flashing
- respect prefers-reduced-motion
- important website features remain usable without the pet

Reduced-motion mode must disable:

- walking across the viewport
- continuous head tracking
- jumping
- constant idle motion
- unnecessary particles

Use immediate repositioning or a short opacity transition instead.

PERSISTENCE

Persist a schema-versioned snapshot containing:

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
- hidden preference
- paused preference
- muted preference

Validate all loaded values.

Support migrations, malformed JSON recovery, debounced writes, capped offline
progression, and reset behavior.

Never access localStorage during server rendering.

PERFORMANCE

- Lazy-load PixiJS and the pet feature.
- Do not delay the primary page render.
- Create Graphics geometry once.
- Avoid rebuilding Graphics inside the ticker.
- Avoid unnecessary filters and large blurred shadows.
- Cap rendering resolution.
- Support 30 FPS low-power mode.
- Stop the ticker while hidden.
- Limit particle counts.
- Remove event listeners, timers, and ticker callbacks during cleanup.
- Avoid per-frame object allocation where practical.

TESTS

Add unit tests for:

1. mood derivation
2. mood hysteresis
3. need clamping
4. lifecycle progression
5. elapsed-time simulation
6. persistence migrations
7. guide target timeout
8. guide placement clamping
9. target-click advancement
10. named-site-event advancement
11. reduced-motion behavior
12. interaction gesture classification

Add a Playwright smoke test where supported:

1. Verify the pet appears.
2. Click or tap the pet.
3. Verify a visible reaction.
4. Perform a petting drag.
5. Start one real guide step.
6. Verify the pet moves beside the target.
7. Click the actual target.
8. Verify the guide advances.
9. Hide the pet.
10. Reload and verify persistence.

VISUAL VERIFICATION

When browser automation is available:

1. Start the application.
2. Capture desktop and mobile screenshots.
3. Capture all moods and life stages.
4. Inspect clipping, proportions, target overlap, speech placement, and visual
   quality.
5. Iterate until the mascot looks polished.
6. Do not claim screenshots were inspected unless they were actually created.

ACCEPTANCE CRITERIA

1. The pet artwork is generated entirely from PixiJS source code.
2. No external character artwork is required.
3. The canvas is transparent.
4. Transparent canvas regions do not block the website.
5. The pet breathes, blinks, tracks the pointer, and performs idle actions.
6. Click, tap, hover, and petting interactions work.
7. Mood changes the face, ears, body pose, and tail.
8. Life stages have visibly different proportions.
9. The pet can walk beside a real data-pet-target element.
10. Guide messages are accessible HTML.
11. State and preferences survive reload.
12. Reduced-motion mode works.
13. Typecheck, lint, unit tests, browser tests, and production build pass.

FINAL REPORT

Report:

1. architecture implemented
2. files created or changed
3. dependencies added
4. commands actually executed
5. tests and build results
6. screenshots actually captured
7. visual compromises
8. incomplete acceptance criteria

Do not report any command, test, screenshot, or visual check as successful unless
it was actually performed.
