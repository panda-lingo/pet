import { createMemoryStorage, STORAGE_KEY, type StorageLike } from '@pet/core';
import { PetProvider } from '@pet/react';
import { DemoPanel, PandaLingoSite } from '@pandalingo/site';
import { fireEvent, render, screen, waitFor, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App.js';
import { SvgPet } from '../src/SvgPet.js';

/**
 * Solution A in jsdom: the pet mounts into the real page, reacts, can be switched off, and
 * remembers that choice. Frame-level behaviour lives in `controller.test.ts`.
 */

/** The page exactly as `App` composes it, minus the deferred mount so tests stay direct. */
function Page({ storage }: { storage: StorageLike | null }): ReactElement {
  return (
    <PetProvider storage={storage} greeting={false} seed={0x51de}>
      <PandaLingoSite edition="Solution A · SVG">
        <DemoPanel renderer="An inline SVG rig" />
      </PandaLingoSite>
      <SvgPet />
    </PetProvider>
  );
}

function renderPage(storage: StorageLike | null = createMemoryStorage()): RenderResult {
  return render(<Page storage={storage} />);
}

describe('solution A in the page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mounts the pet after the page, without blocking it', async () => {
    render(<App />);
    // The page is there on the first paint; the pet is lazy and idle-deferred.
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    const pet = await waitFor(() => screen.getByTestId('pet-root'));

    const svg = pet.querySelector('svg.pl-panda');
    expect(svg).not.toBeNull();
    // The controller has painted: pose custom properties are on the element.
    expect((svg as SVGSVGElement).style.getPropertyValue('--p-root-scale')).not.toBe('');
    expect(pet.dataset.mood).toBe('neutral');
    expect(pet.dataset.motion).toBe('calm');
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

  it('renders one static frame when the visitor prefers reduced motion', () => {
    document.documentElement.dataset.reducedMotion = 'true';
    renderPage();

    const pet = screen.getByTestId('pet-root');
    expect(pet.dataset.motion).toBe('still');
    expect(screen.getByTestId('demo-motion').textContent).toBe('still');

    const svg = pet.querySelector('svg.pl-panda') as SVGSVGElement;
    expect(svg.style.getPropertyValue('--p-root-rot')).toBe('0.000');
    expect(svg.style.getPropertyValue('--p-body-sy')).toBe('1.000');
    expect(svg.style.getPropertyValue('--p-root-x')).toBe('0.000');
  });
});
