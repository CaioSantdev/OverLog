import { test, expect } from '@playwright/test';
import { sessionApi } from './helpers/sessionApi';

const comparisons = [
  { exercise_id: 'ex-1', exercise_name: 'Supino reto', set_id: 'set-1', set_position: 0, set_type: 'work', current_weight: '65.00', current_repetitions: 8, previous_session_id: 'previous', previous_weight: '60.00', previous_repetitions: 8, outcome: 'weight_progress' },
  { exercise_id: 'ex-1', exercise_name: 'Supino reto', set_id: 'set-2', set_position: 1, set_type: 'work', current_weight: '60.00', current_repetitions: 10, previous_session_id: 'previous', previous_weight: '60.00', previous_repetitions: 8, outcome: 'repetition_progress' },
];

test('mostra conquistas e comparação anterior/atual após finalizar', async ({ page }) => {
  await sessionApi(page);
  await page.route('**/api/sessions/*/progression', route => route.fulfill({ json: { policy_version: 1, weight_progressions: 1, repetition_progressions: 1, compared_sets: 2, comparisons } }));
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('65');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Finalizar treino ↗', exact: true }).first().click();
  await page.getByRole('button', { name: 'Sim, finalizar treino', exact: true }).click();
  await expect(page.getByText('Você evoluiu neste treino!', { exact: true })).toBeVisible();
  await expect(page.getByText('Progressão de carga', { exact: false })).toBeVisible();
  await expect(page.getByText('Progressão de repetições', { exact: false })).toBeVisible();
  await expect(page.locator('.comparison-values').first()).toContainText('60,00 kg × 8');
  await expect(page.locator('.comparison-values').first()).toContainText('65,00 kg × 8');
  await expect(page.getByRole('link', { name: 'Ver sessão de referência ↗' }).first()).toHaveAttribute('href', '/sessoes/previous');
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('primeira sessão informa ausência de base e permite tentar novamente após erro', async ({ page }) => {
  await sessionApi(page);
  let fail = true;
  await page.route('**/api/sessions/*/progression', route => fail ? route.fulfill({ status: 503, json: { detail: 'Comparação indisponível.' } }) : route.fulfill({ json: { policy_version: 1, weight_progressions: 0, repetition_progressions: 0, compared_sets: 0, comparisons: [{ ...comparisons[0], previous_session_id: null, previous_weight: null, previous_repetitions: null, outcome: 'no_baseline' }] } }));
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('20');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Finalizar treino ↗', exact: true }).first().click();
  await page.getByRole('button', { name: 'Sim, finalizar treino', exact: true }).click();
  await expect(page.getByText('Comparação indisponível.', { exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Tentar carregar comparação', exact: true }).click();
  await expect(page.getByText('Primeiro registro deste exercício', { exact: true })).toBeVisible();
  await expect(page.getByText('Você evoluiu neste treino!', { exact: true })).toHaveCount(0);
});

test('área de evolução mostra indicadores das sessões e acesso ao resumo detalhado', async ({ page }) => {
  await sessionApi(page);
  await page.route('**/api/sessions?*', route => route.fulfill({ json: [{ id: 'finished', name_snapshot: 'Peito e tríceps', status: 'completed', started_at: '2026-11-01T15:00:00Z', duration_seconds: 1800, completed_sets: 10, revision: 2, weight_progressions: 2, repetition_progressions: 1 }] }));
  await page.goto('/');
  await page.getByRole('link', { name: 'Evolução e conquistas ↗', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Evolução e conquistas.' })).toBeVisible();
  await expect(page.getByText('2 progressões de carga · 1 de repetições', { exact: true })).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'Peito e tríceps' })).toHaveAttribute('href', '/sessoes/finished');
});
