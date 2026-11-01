import { test, expect } from '@playwright/test';
import { sessionApi } from './helpers/sessionApi';

test('permite concluir e salvar duas sessões consecutivas de um plano sem carga', async ({ page }) => {
  const api = await sessionApi(page);
  await page.goto('/');
  for (const load of ['20,5', '30.75']) {
    await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
    const checkbox = page.getByRole('checkbox', { name: 'Série 1 concluída', exact: true });
    await expect(checkbox).toBeEnabled();
    await checkbox.check();
    await expect(page.getByText('Informe a carga desta série para salvar a conclusão. Use 0 para peso corporal.')).toBeVisible();
    await expect(page.getByLabel('Carga (kg)', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
    await expect(page.getByText('Confira os campos para salvar', { exact: true })).toBeVisible();
    await page.getByLabel('Carga (kg)', { exact: true }).fill(load);
    await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
    await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
    expect(api.writes.at(-1).exercises[0].sets[0].weight).toBe(load.replace(',', '.'));
    expect(api.writes.at(-1).exercises[0].sets[0].is_completed).toBe(true);
    await page.getByRole('button', { name: 'Finalizar treino ↗', exact: true }).first().click();
    await page.getByRole('button', { name: 'Sim, finalizar treino', exact: true }).click();
    await expect(page.getByText('TREINO CONCLUÍDO', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Voltar aos meus treinos', exact: true }).click();
  }
});

test('salva série pendente sem carga e aceita zero para concluir peso corporal', async ({ page }) => {
  const api = await sessionApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await page.getByLabel('Repetições', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
  await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
  expect(api.writes.at(-1).exercises[0].sets[0].weight).toBeNull();
  await page.getByRole('checkbox').check();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
  await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
  expect(api.writes.at(-1).exercises[0].sets[0].weight).toBe('0');
  expect(api.writes.at(-1).exercises[0].sets[0].is_completed).toBe(true);
});

test('reenvia carga com vírgula após falha de rede sem perder o rascunho', async ({ page }) => {
  const api = await sessionApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await page.getByLabel('Carga (kg)', { exact: true }).fill('42,75');
  await page.getByRole('checkbox').check();
  api.failSave();
  await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
  await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar salvar novamente', exact: true }).click();
  await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Carga (kg)', { exact: true })).toHaveValue('42.75');
  await expect(page.getByRole('checkbox')).toBeChecked();
  expect(api.writes).toHaveLength(1);
});
