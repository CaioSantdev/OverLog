import { test, expect } from '@playwright/test';
import { sessionApi } from './helpers/sessionApi';

test('retornar à aba preserva uma edição de treino ainda não salva', async ({ page }) => {
  await sessionApi(page);
  await page.goto('/treinos/novo');
  await page.getByLabel('Nome do treino', { exact: true }).fill('Rascunho que não pode sumir');
  await page.getByRole('button', { name: '+ Adicionar exercício', exact: true }).click();
  await page.getByLabel('Nome do exercício', { exact: true }).fill('Supino');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByLabel('Nome do treino', { exact: true })).toHaveValue('Rascunho que não pode sumir');
  await expect(page.getByLabel('Nome do exercício', { exact: true })).toHaveValue('Supino');
});

test('falha de rede ao revalidar login não desmonta o editor', async ({ page }) => {
  await sessionApi(page);
  await page.goto('/treinos/novo');
  await page.getByLabel('Nome do treino', { exact: true }).fill('Rascunho offline');
  await page.route('**/api/auth/me', route => route.abort());
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByLabel('Nome do treino', { exact: true })).toHaveValue('Rascunho offline');
});

test('timeout libera nova tentativa e mantém os dados pendentes da série', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T15:00:00Z') });
  await sessionApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('42,5');
  await page.getByRole('checkbox').check();
  await page.route('**/api/sessions/session-1', route => route.request().method() === 'PUT' ? new Promise<void>(() => {}) : route.fallback());
  await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
  await expect(page.getByText('Salvando…', { exact: true })).toBeVisible();
  await page.clock.fastForward(16000);
  await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Carga (kg)', { exact: true })).toHaveValue('42,5');
  await page.unroute('**/api/sessions/session-1');
  await page.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
  await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
});
