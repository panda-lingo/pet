# PandaLingo website pet — two solutions

Two complete implementations of the PandaLingo companion pet, sharing one brand-aligned domain
core, built to the two briefs in `../solution/`:

| | Solution A | Solution B |
| --- | --- | --- |
| Brief | `solution/svg.md` | `solution/PixiJS.md` |
| Renderer | inline layered SVG + CSS custom properties | PixiJS v8 `Graphics`, one WebGL canvas |
| App | `apps/svg-pet` | `apps/pixi-pet` |
| Deliverable | `dist-html/svg-pet.html` (291 kB) | `dist-html/pixi-pet.html` (776 kB) |

Open either HTML file straight from disk — no server, no build step, no external assets. The
pet is drawn from source geometry in both cases: no PNGs, no sprite sheets, no Lottie, Rive or
GLB, and nothing visual is fetched over the network.

## Layout

```
packages/pet-core    framework-free domain: state store, moods, needs, life stages, persistence,
                     idle selector, guide state machine, gesture classification, pose engine,
                     brand tokens, panda geometry (paths, pivots, palette)
packages/pet-react   React bridge: PetProvider, context, gestures, guide runner, speech bubble,
                     controls, target highlight, the shared pet chrome (PetOverlay) and pet-ui.css
packages/site        the PandaLingo demo site both solutions are embedded in (hero, nav, speak
                     and progress pages, demo panel, brand tokens)
apps/svg-pet         Solution A: PandaSvg + panda.css + svgAnimationController
apps/pixi-pet        Solution B: buildPanda + petAnimationController + pixiStage
scripts              collect-html.mjs (delivery), shots.mjs (screenshots)
```

The split is the point: everything that decides *what the pet is doing* lives in `pet-core` and
is shared verbatim; each app only decides *how a pose becomes pixels*.

## The shared pose engine

`PoseEngine.update(dtMs)` returns one reused `PoseSnapshot` — about thirty numbers describing the
pose in a 100×100 pet-local box, angles in degrees. It owns breathing, blinking, gaze, the gait,
reactions, idle behaviours and the mood/stage blend; it allocates nothing per frame and it never
touches the DOM.

Each renderer has exactly one controller that writes that snapshot out once per frame:

- **A** writes ~30 CSS custom properties onto the `<svg>` element, and `panda.css` resolves them
  into transforms. `requestAnimationFrame` is the clock.
- **B** writes `Container.position`, `pivot`, `rotation`, `scale` and `alpha`. The PixiJS ticker is
  the clock.

Both diff every write, so a reduced-motion (still) pose costs nothing after its first frame.
Frame values never pass through React state in either solution.
The two rigs are deliberately the same algebra, which is why the two pandas are the same panda:

```
CSS   translate(offset) translate(pivot) rotate(r) scale(s) translate(-pivot)
Pixi  position = pivot + offset ; pivot = pivot ; rotation = r · π/180 ; scale = s
```

PixiJS composes a container's local matrix as `translate(position) · rotate · scale ·
translate(-pivot)`, so the same pose numbers resolve to the same matrix in both renderers. Every
pivot comes from `PIVOT` in `pet-core/src/artwork.ts`; nothing relies on a default origin.

## Running it

```bash
npm install
npm run dev:svg     # Solution A on http://localhost:4321
npm run dev:pixi    # Solution B on http://localhost:4322
npm run verify      # typecheck + lint + unit tests + both single-file builds
npm run e2e         # builds, then runs both Playwright smoke tests
npm run build:html  # writes dist-html/{svg-pet,pixi-pet,index}.html
node scripts/shots.mjs pixi-pet   # screenshots/ (desktop, mobile, gallery, speak)
```

`#gallery` on either app replaces the page with eleven deterministic review frames — every mood,
all three life stages, mid-blink, mid-stride, the pointing pose — plus the same panda at 120, 180
and 240 px. `#speak` and `#progress` are the demo site's own pages.

## Solution B specifics

- One transparent `Application`, `autoDensity`, `resolution` capped at 2, `powerPreference:
  'low-power'`, `autoStart: false`. `maxFPS` follows the runtime's 30/60 preference.
- The ticker is the only clock, and it is stopped — not idling — while the document is hidden or
  the pet is hidden. `destroy()` removes its listeners, its ticker callback and its canvas.
- Geometry is built once per page: 27 `GraphicsContext`es cached by gradient capability and shared
  by every scene, so a gallery of fourteen pandas builds one set of paths. Contexts are passed to
  the `Graphics` constructor, which means `destroy()` frees containers and leaves the shared
  geometry alone for the next pet.
- The canvas is 240–300 px square (by breakpoint), larger than the pet box so hops, stretches and
  particle bursts have room, `pointer-events: none`, and a sibling of the hit area rather than a
  child of it — a canvas that big inside the `<button>` would make the hit area that big too.
- Particles are a fixed pool (4 hearts, 6 sparkles) spawned on the rising edge of `pose.heart` /
  `pose.sparkle`, so a burst allocates nothing and a fast clicker cannot flood the scene.
- No WebGL is not a broken page: `createPixiStage` resolves to `null`, the host reports
  `data-status="unsupported"`, and the pet keeps its bubble, its tour, its controls and its
  keyboard access with a quiet brand-coloured disc in place of the canvas.

### DOM → pet-local coordinates

There is no bespoke hit-testing layer, because the pointer surface is DOM in both solutions:
`PetOverlay` positions the pet box with `translate3d`, `.pl-pet-hit` is the tightly fitted blob
inside it, and `useGestures` classifies pointerdown/move/up/cancel, tap, hover and the petting
drag through `pet-core`'s tracker (with pointer capture, so a stroke survives leaving the blob).
`PetProvider` normalises client coordinates into a clamped −1…1 pet-relative gaze, and the
controller's `unit`/`inset` maths maps that pet box onto the canvas and into the 100×100 pet-local
space the pose engine speaks.
## Tests

`npm test` runs 151 unit tests in three Vitest projects. The briefs each list twelve unit-test
subjects; because the domain is shared, so are most of the tests:

| Subject | Where |
| --- | --- |
| mood derivation, mood hysteresis | `packages/pet-core/test/mood.test.ts` |
| need clamping | `needs.test.ts` |
| lifecycle progression, elapsed-time simulation | `lifecycle.test.ts`, `persistence.test.ts` |
| persistence migrations, malformed JSON | `persistence.test.ts`, `store.test.ts` |
| guide target timeout, placement clamping | `guide.test.ts`, `placement.test.ts` |
| gesture classification | `gestures.test.ts` |
| target-click and site-event advancement | each app's `tests/guide.test.tsx` |
| reduced-motion behaviour | each app's `tests/pet.test.tsx` and `tests/controller.test.ts` |
| per-frame renderer behaviour | each app's `tests/controller.test.ts` |

Playwright covers each app end to end against its built single-file artefact: the pet appears,
takes a click, answers a petting drag (Solution B), walks to a real page element during a guide
step, advances when that element is clicked, hides, and remembers being hidden across a reload.

## Brand

Everything visual comes from `/home/ubuntu/speak/brand`: the ink/cream/gold palette, the calm
"quiet café with a good teacher" tone, the 8-point rhythm, the 148/132/116 companion and
64/56/48 dock footprints, and the copy voice (no streak-shaming, no exclamation marks — there is
not one in `copy.ts`). `useBrandTokens()` publishes the tokens as CSS custom properties;
`pet-core/src/brand.ts` is the single source both renderers read.

## Honest notes and compromises

- **Display typeface.** The brand book specifies Canela, which is commercially licensed. Both
  pages load Cormorant Garamond from Google Fonts as the nearest open substitute, behind a full
  fallback stack — opened offline, the layout is unchanged and the serif falls back to Georgia.
  This is the only network request either page makes.
- **Single-file trade-off.** `vite-plugin-singlefile` inlines everything, which means Solution B's
  lazy PixiJS chunk ends up inline in the delivered HTML. The lazy boundary is real in `npm run
  dev` and in a normal `vite build` (PixiJS is only imported by `pixiStage.ts`); the one-file
  artefact trades that win for opening from `file://`.
- **Gradients in jsdom.** `FillGradient` bakes a canvas texture eagerly, which jsdom cannot do, so
  `buildPanda({ gradients: false })` swaps the six gradients for their flat mid-tones in unit
  tests. The browser always gets the gradients.
- **The gallery uses fourteen WebGL contexts** (one per cell), which is inside the browser limit
  only because that route never mounts the live pet. It is a review page, not a shipping pattern;
  the real page has exactly one context.
- **Renderer parity is close, not pixel-identical.** PixiJS resolves radial gradients slightly
  differently from an SVG `objectBoundingBox` gradient, so Solution B's belly highlight and head
  shading are a touch softer than Solution A's. Compare `screenshots/svg-pet-gallery.png` with
  `screenshots/pixi-pet-gallery.png`.
- **`@types/node`** is a dev dependency purely so the Vite configs may use `node:url`.
- **No audio, no flashing, no focus trap.** Reduced motion disables walking, head tracking,
  jumping, constant idle motion and particles, and travel becomes instantaneous.


