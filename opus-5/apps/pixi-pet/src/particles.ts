import { Graphics, GraphicsContext, GraphicsPath, type Container } from 'pixi.js';
import { hexToNumber, pandaColor, type PetRuntimeState, type PoseSnapshot } from '@pet/core';

/**
 * Hearts and sparkles for Solution B.
 *
 * `pose.heart` and `pose.sparkle` are 0–1 bell curves, so a burst is spawned on their rising
 * edge — once per reaction, never per frame. Everything here is pooled and pre-built:
 *
 * - two `GraphicsContext`es for the whole page, one per shape
 * - a fixed pool of `Graphics`, so a burst allocates nothing at all
 * - a hard cap on live particles, which is what keeps a fast clicker from flooding the scene
 */

const LIMIT = { heart: 4, sparkle: 6 } as const;
const EDGE = 0.2;
const SHAPE = {
  heart: 'M0 2.4C-2.9 0.3-2.9-2.6-1-2.6-0.2-2.6 0-2 0-1.6 0-2 0.2-2.6 1-2.6 2.9-2.6 2.9 0.3 0 2.4Z',
  sparkle: 'M0-2.6L0.7-0.7L2.6 0L0.7 0.7L0 2.6L-0.7 0.7L-2.6 0L-0.7-0.7Z',
} as const;

type Kind = keyof typeof SHAPE;

interface Particle {
  view: Graphics;
  kind: Kind;
  /** Milliseconds since the burst was spawned, including the stagger delay. */
  life: number;
  ttl: number;
  delay: number;
  x0: number;
  y0: number;
  drift: number;
  rise: number;
  live: boolean;
}

export interface ParticleLayer {
  /** Called once per frame by the controller, after the pose has been written. */
  update(pose: PoseSnapshot, dtMs: number, state: PetRuntimeState): void;
  /** Hides every live particle; used when motion drops to still, and on teardown. */
  clear(): void;
}

const contextCache = new Map<Kind, GraphicsContext>();

/** One shared context per shape, built the first time a page needs it. */
function contextFor(kind: Kind): GraphicsContext {
  let context = contextCache.get(kind);
  if (!context) {
    const color = hexToNumber(kind === 'heart' ? pandaColor.scarf : pandaColor.coat);
    context = new GraphicsContext().path(new GraphicsPath(SHAPE[kind])).fill({ color });
    contextCache.set(kind, context);
  }
  return context;
}

export function createParticleLayer(layer: Container): ParticleLayer {
  const pool: Particle[] = [];
  for (const kind of ['heart', 'sparkle'] as const) {
    for (let i = 0; i < LIMIT[kind]; i += 1) {
      const view = new Graphics({ context: contextFor(kind), label: `${kind}-${i}`, visible: false });
      layer.addChild(view);
      pool.push({ view, kind, life: 0, ttl: 0, delay: 0, x0: 0, y0: 0, drift: 0, rise: 0, live: false });
    }
  }

  let lastHeart = 0;
  let lastSparkle = 0;

  /**
   * Fans a burst out around the top of the head, biased towards the side the pet faces — the
   * same layout as Solution A's SVG burst, so the two pandas celebrate identically.
   */
  function spawn(kind: Kind, count: number, facing: number): void {
    let index = 0;
    for (const particle of pool) {
      if (index >= count) return;
      if (particle.kind !== kind || particle.live) continue;
      const spread = (index - (count - 1) / 2) * 7;
      particle.life = 0;
      particle.delay = index * 110;
      particle.ttl = kind === 'heart' ? 1_200 : 900;
      particle.x0 = 50 + spread * 0.6 + facing * 4;
      particle.y0 = 16 - Math.abs(spread) * 0.3;
      particle.drift = spread * 0.5;
      particle.rise = kind === 'heart' ? 16 : 9;
      particle.live = true;
      particle.view.visible = false;
      index += 1;
    }
  }

  /** Rise, drift and fade. Three lines of maths per particle, no allocation. */
  function step(particle: Particle, dtMs: number): void {
    particle.life += dtMs;
    const t = (particle.life - particle.delay) / particle.ttl;
    if (t < 0) return;
    if (t >= 1) {
      particle.live = false;
      particle.view.visible = false;
      return;
    }
    const ease = t * t * (3 - 2 * t);
    const view = particle.view;
    view.visible = true;
    view.position.set(particle.x0 + particle.drift * ease, particle.y0 - particle.rise * ease);
    // Fade in fast, hold, then fade out — a bell, so nothing ever pops off the screen.
    view.alpha = t < 0.32 ? (t / 0.32) * 0.92 : 0.92 * (1 - (t - 0.32) / 0.68);
    const scale = t < 0.32 ? 0.4 + 0.6 * (t / 0.32) : 1 - 0.3 * ((t - 0.32) / 0.68);
    view.scale.set(scale, scale);
  }

  function clear(): void {
    for (const particle of pool) {
      particle.live = false;
      particle.view.visible = false;
    }
  }

  return {
    update(pose, dtMs, state): void {
      if (!state.capabilities.particles) {
        // Reduced motion: no bursts at all, and no stale ones left on screen either.
        lastHeart = pose.heart;
        lastSparkle = pose.sparkle;
        clear();
        return;
      }
      if (pose.heart > EDGE && lastHeart <= EDGE) spawn('heart', LIMIT.heart, state.facing);
      if (pose.sparkle > EDGE && lastSparkle <= EDGE) spawn('sparkle', LIMIT.sparkle, state.facing);
      lastHeart = pose.heart;
      lastSparkle = pose.sparkle;
      for (const particle of pool) if (particle.live) step(particle, dtMs);
    },
    clear,
  };
}
