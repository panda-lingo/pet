import { createMemoryStorage, STORAGE_KEY, type StorageLike } from '@pet/core';
import { PetProvider } from '@pet/react';
import { DemoPanel, PandaLingoSite } from '@pandalingo/site';
import { fireEvent, render, screen, waitFor, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App.js';
import { PixiPet } from '../src/PixiPet.js';

/**
 * Solution B in jsdom: the pet mounts into the real page, reacts, can be switched off, and
 * remembers that choice — all of it without a WebGL context, which is the point. Frame-level
 * behaviour lives in `controller.test.ts`.
 */

/** The page exactly as `App` composes it, minus the deferred mount so tests stay direct. */
function Page({ storage }: { storage: StorageLike | null }): ReactElement {
  return (
    <PetProvider storage={storage} greeting={false} seed={0x51de}>
      <PandaLingoSite edition="Solution B · PixiJS">
        <DemoPanel renderer="A PixiJS v8 scene" />
      </PandaLingoSite>
      <PixiPet />
    </PetProvider>
  );
}

function renderPage(storage: StorageLike | null = createMemoryStorage()): RenderResult {
  return render(<Page storage={storage} />);
}

describe('solution B in the page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mounts the pet after the page, without blocking it', async () => {
    render(<App />);
    // The page is there on the first paint; the pet is lazy and idle-deferred, and PixiJS is
    // one level deeper still, inside the stage module.
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    const pet = await waitFor(() => screen.getByTestId('pet-root'));

    const host = screen.getByTestId('pixi-host');
    // The canvas host is a sibling of the hit area, never a child: a 300px canvas inside the
    // button would make the button 300px too.
    expect(host.parentElement).toBe(pet);
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(pet.dataset.mood).toBe('neutral');
    expect(pet.dataset.motion).toBe('calm');
  });
  it('keeps the page, the bubble and the controls working where WebGL is missing', async () => {
    renderPage();
    const host = screen.getByTestId('pixi-host');

    // jsdom has no WebGL, so `Application.init()` fails and the stage reports itself unusable.
    await waitFor(() => expect(host.dataset.status).toBe('unsupported'));
    expect(host.querySelector('canvas')).toBeNull();

    // The pet is still a working companion: it takes a tap and it still speaks.
    fireEvent.keyDown(screen.getByTestId('pet-hit'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBeTruthy());
    expect(screen.getByLabelText('Panda settings')).toBeDefined();
  });

  it('reacts to a tap and says something', async () => {
    renderPage();
    const hit = screen.getByTestId('pet-hit');
    expect(screen.getByTestId('demo-xp').textContent).toBe('0');

    // Enter on the focusable hit area is the keyboard equivalent of a tap.
    fireEvent.keyDown(hit, { key: 'Enter' });

    await waitFor(() => expect(screen.getByRole('status').textContent).toBeTruthy());
    expect(Number(screen.getByTestId('demo-xp').textContent)).toBeGreaterThan(0);
  });

  it('classifies a petting drag across the hit area', async () => {
    renderPage();
    const hit = screen.getByTestId('pet-hit');

    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 100, clientY: 200, isPrimary: true });
    for (let i = 1; i <= 6; i += 1) {
      fireEvent.pointerMove(hit, { pointerId: 1, clientX: 100 + i * 14 * (i % 2 ? 1 : -1), clientY: 200 });
    }
    fireEvent.pointerUp(hit, { pointerId: 1, clientX: 100, clientY: 200 });

    // A drag is a stroke, not a tap: the pet reads it as petting and answers.
    await waitFor(() => expect(screen.getByRole('status').textContent).toBeTruthy());
    expect(Number(screen.getByTestId('demo-xp').textContent)).toBeGreaterThan(0);
  });
  it('can be hidden, always leaves a way back, and remembers the choice', async () => {
    const storage = createMemoryStorage();
    const view = renderPage(storage);

    fireEvent.click(screen.getByLabelText('Panda settings'));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));

    const pet = screen.getByTestId('pet-root');
    expect(pet.getAttribute('aria-hidden')).toBe('true');
    expect(pet.style.visibility).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Bring Panda back' })).toBeDefined();

    // Unmounting flushes the debounced save, so the preference is on disk, not in flight.
    view.unmount();
    expect(storage.getItem(STORAGE_KEY)).toContain('"hidden":true');

    renderPage(storage);
    expect(await screen.findByRole('button', { name: 'Bring Panda back' })).toBeDefined();

    // And it can be undone from that pill alone.
    fireEvent.click(screen.getByRole('button', { name: 'Bring Panda back' }));
    expect(screen.getByTestId('pet-root').style.visibility).toBe('visible');
  });

  it('pauses the pet from its own controls', () => {
    const storage = createMemoryStorage();
    const view = renderPage(storage);

    fireEvent.click(screen.getByLabelText('Panda settings'));
    const pause = screen.getByRole('button', { name: 'Pause' });
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(pause);

    expect(screen.getByRole('button', { name: 'Resume' }).getAttribute('aria-pressed')).toBe('true');
    view.unmount();
    expect(storage.getItem(STORAGE_KEY)).toContain('"paused":true');
  });

  it('drops to the still profile when the visitor prefers reduced motion', () => {
    document.documentElement.dataset.reducedMotion = 'true';
    renderPage();

    const pet = screen.getByTestId('pet-root');
    expect(pet.dataset.motion).toBe('still');
    expect(screen.getByTestId('demo-motion').textContent).toBe('still');
    // Travel is instant in the still profile, so nothing walks anywhere.
    expect(pet.style.transitionDuration).toBe('0ms');
  });
});
