import { expect, test, type Locator } from '@playwright/test';

/**
 * Solution A smoke test, run against the production single-file build served by
 * `vite preview` — the same artefact that is delivered as `dist-html/svg-pet.html`.
 *
 * It walks the whole brief in one session: the pet appears, reacts to a click, guides the
 * visitor to a real page element, advances when that element is clicked, and remembers being
 * hidden across a reload.
 */

async function centreOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test('the pet appears, reacts, guides, and remembers being hidden', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');

  // 1–2. The page loads and the pet appears in its dock.
  await expect(page.getByRole('heading', { level: 1, name: /Speak naturally/ })).toBeVisible();
  const pet = page.getByTestId('pet-root');
  await expect(pet).toBeVisible();
  await expect(pet.locator('svg.pl-panda')).toBeVisible();
  const docked = await centreOf(pet);

  // 3. A click on the pet is a visible reaction: XP rises and the pet speaks.
  const xp = page.getByTestId('demo-xp');
  await expect(xp).toHaveText('0');
  await page.getByTestId('pet-hit').click();
  await expect(xp).not.toHaveText('0');
  await expect(pet.getByRole('status')).toBeVisible();

  // 4. One guide step, started from the page's own control.
  await page.getByTestId('demo-tour-welcome').click();
  await expect(page.getByTestId('demo-guide')).toContainText('Step 1 of 6');
  await expect(pet.getByRole('status')).toContainText('Speak is where your conversations live');
  // 5. The pet has left its dock and is standing beside the real nav item.
  const target = page.locator('[data-pet-target="nav-speak"]');
  await expect(target).toBeVisible();
  const anchor = await centreOf(target);
  await expect
    .poll(
      async () => {
        const now = await centreOf(pet);
        return Math.hypot(now.x - anchor.x, now.y - anchor.y);
      },
      { message: 'the pet walks to within arm’s reach of its target', timeout: 10_000 },
    )
    .toBeLessThan(220);
  const beside = await centreOf(pet);
  expect(Math.hypot(beside.x - docked.x, beside.y - docked.y)).toBeGreaterThan(40);

  // 6. Step 2 waits for a click on a real page element, so click it for real.
  await pet.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('demo-guide')).toContainText('Step 2 of 6');
  await expect(pet.getByRole('status')).toContainText('Start here when you are ready');
  await page.locator('[data-pet-target="hero-cta"]').click();

  // 7. The guide advances on its own once the site's own element was used.
  await expect(page.getByTestId('demo-guide')).toContainText('Step 3 of 6');

  // 8. Hidden from the pet's own controls, with a way back left on the page.
  await page.getByLabel('Panda settings').click();
  await page.getByRole('button', { name: 'Hide' }).click();
  const back = page.getByRole('button', { name: 'Bring Panda back' });
  await expect(back).toBeVisible();
  await expect(pet).toHaveAttribute('aria-hidden', 'true');

  // 9. The preference survives a reload — and is still reversible afterwards.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bring Panda back' })).toBeVisible();
  await expect(page.getByTestId('pet-root')).toHaveAttribute('aria-hidden', 'true');
  await page.getByRole('button', { name: 'Bring Panda back' }).click();
  await expect(page.getByTestId('pet-root')).not.toHaveAttribute('aria-hidden', 'true');

  expect(errors).toEqual([]);
});
