import { createMemoryStorage, type GuideTour } from '@pet/core';
import { PetProvider } from '@pet/react';
import { DemoPanel, PandaLingoSite } from '@pandalingo/site';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PixiPet } from '../src/PixiPet.js';

/**
 * Guided tours, driven through the real page: a step completes when the visitor clicks the
 * element the pet is pointing at, or when the site announces the event the step waits for.
 *
 * The guide is renderer-agnostic — it lives in `@pet/react` and moves the DOM pet box, not the
 * canvas — so these tests are Solution A's, re-run against Solution B to prove that. They run in
 * the reduced-motion profile on purpose: travel time is then 0ms, so the assertions are about
 * the state machine rather than about waiting for a walk to finish.
 */

function renderTour(tours?: readonly GuideTour[]): void {
  render(
    <PetProvider storage={createMemoryStorage()} greeting={false} seed={0x51de} tours={tours}>
      <PandaLingoSite edition="Solution B · PixiJS">
        <DemoPanel renderer="A PixiJS v8 scene" />
      </PandaLingoSite>
      <PixiPet />
    </PetProvider>,
  );
}

const EVENT_TOUR: readonly GuideTour[] = [
  {
    id: 'event',
    title: 'Event tour',
    steps: [
      {
        id: 'practice',
        target: 'practice-input',
        message: 'Try one sentence. I will listen, not judge.',
        preferredPlacement: 'right',
        action: 'sit',
        completion: { type: 'site-event', event: 'practice-submitted' },
      },
    ],
  },
];

/** The pet's own bubble. Scoped, because the practice page has a `role="status"` of its own. */
function bubble(): HTMLElement {
  return within(screen.getByTestId('pet-root')).getByRole('status');
}
describe('guided tours', () => {
  beforeEach(() => {
    document.documentElement.dataset.reducedMotion = 'true';
  });

  it('advances when the visitor clicks the element the pet points at', async () => {
    renderTour();
    fireEvent.click(screen.getByTestId('demo-tour-welcome'));

    await waitFor(() => expect(screen.getByTestId('demo-guide').textContent).toContain('Step 1 of 6'));
    // Step 1 is manual: the bubble carries the controls.
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));

    // Step 2 waits for a real click on the hero call to action.
    await waitFor(() => expect(bubble().textContent).toContain('Start here when you are ready'));
    expect(screen.getByTestId('demo-guide').textContent).toContain('Step 2 of 6');

    fireEvent.click(screen.getByText('Start speaking'));
    await waitFor(() => expect(screen.getByTestId('demo-guide').textContent).toContain('Step 3 of 6'));
  });

  it('advances when the site announces the event a step waits for', async () => {
    window.location.hash = '#speak';
    renderTour(EVENT_TOUR);
    fireEvent.click(screen.getByTestId('demo-tour-event'));

    await waitFor(() => expect(bubble().textContent).toContain('Try one sentence'));
    expect(screen.getByTestId('demo-guide').textContent).toContain('Step 1 of 1');

    // The page dispatches `practice-submitted` from its own form — the pet never touches it.
    fireEvent.click(screen.getByRole('button', { name: 'Send to Panda' }));

    await waitFor(() => expect(screen.getByTestId('demo-guide').textContent).toContain('1 finished'));
  });

  it('recovers instead of deadlocking when a target never appears', async () => {
    renderTour();
    fireEvent.click(screen.getByTestId('demo-tour-diagnostics'));

    // The first step points at nothing, so the bounded wait expires and offers a way out.
    await waitFor(() => expect(bubble().textContent).toContain('I cannot find that part of the page yet'), {
      timeout: 4_000,
    });
    expect(bubble().textContent).toContain('Retry');

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(screen.getByTestId('demo-guide').textContent).toContain('Step 2 of 2'));
    await waitFor(() => expect(bubble().textContent).toContain('Recovered'));
  });
});
