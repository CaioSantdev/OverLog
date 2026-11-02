import { test, expect } from '@playwright/test';
import { sessionApi } from './helpers/sessionApi';

test('dashboard mostra indicadores reais, gráfico e navegação de treinos', async ({ page }) => {
  await sessionApi(page);
  await page.route('**/api/dashboard?*', route => route.fulfill({ json: {
    completed_sessions: 7, sessions_this_week: 2, progressions: 3, week_days: [1,0,1,0,0,0,0], timezone: 'UTC',
    weeks: Array.from({ length: 12 }, (_, index) => ({ week_start: new Date(Date.UTC(2026, 7, 10 + index * 7)).toISOString().slice(0, 10), sessions: index > 5 ? 1 : 0, volume: String(index > 5 ? index * 100 : 0) })),
  } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Olá, Teste.' })).toBeVisible();
  await expect(page.locator('.dashboard-stats')).toContainText('7');
  await expect(page.getByRole('img', { name: /Volume de treino nas últimas/ })).toBeVisible();
  await page.getByRole('button', { name: '12 semanas', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Volume de treino nas últimas 12 semanas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  const navigation = page.viewportSize()!.width <= 900 ? page.getByRole('navigation', { name: 'Navegação do celular' }) : page.getByRole('navigation', { name: 'Navegação principal' });
  await navigation.getByRole('link', { name: /Treinos|Meus treinos/ }).click();
  await expect(page).toHaveURL(/\/treinos$/);
  await expect(page.getByRole('heading', { name: 'Meus treinos.' })).toBeVisible();
});

test('sessão compacta mantém campos, siglas e controles sem rolagem horizontal', async ({ page }) => {
  await sessionApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await expect(page.locator('.session-set .set-type-badge')).toHaveText('W');
  await page.getByLabel('Carga (kg)', { exact: true }).fill('62,5');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
  await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Iniciar descanso', exact: true })).toBeVisible();
  }
});
