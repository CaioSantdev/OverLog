import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('catálogo real está disponível para uma conta nova e permite treino misto', async ({ page, browser, baseURL }) => {
  const privateName = `Variação privada ${randomUUID().slice(0, 8)}`;
  await page.goto('/cadastro');
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa do catálogo');
  await page.getByLabel('E-mail', { exact: true }).fill(`catalog-${randomUUID()}@example.com`);
  await page.getByLabel('Senha', { exact: true }).fill(randomUUID());
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('link', { name: '+ Criar treino', exact: true }).click();
  await page.getByLabel('Nome do treino', { exact: true }).fill('Treino com catálogo');
  await page.getByRole('button', { name: 'Escolher do catálogo', exact: true }).click();
  await page.getByLabel('Buscar exercício', { exact: true }).fill('supino');
  await page.getByRole('combobox', { name: 'Grupo muscular', exact: true }).selectOption('Peito');
  await page.getByRole('combobox', { name: 'Equipamento', exact: true }).selectOption('Barra');
  await page.getByRole('button', { name: 'Adicionar Supino reto com barra', exact: true }).click();
  await page.getByRole('button', { name: '+ Adicionar exercício', exact: true }).click();
  await page.getByLabel('Nome do exercício', { exact: true }).nth(1).fill(privateName);
  await page.getByRole('button', { name: 'Salvar treino', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meus treinos.' })).toBeVisible();
  const workouts = await (await page.request.get('/api/workouts')).json();
  expect(workouts[0].exercises[0].catalog_exercise_id).toBe('supino-reto-barra');
  expect(workouts[0].exercises[1].catalog_exercise_id).toBeNull();
  const firstCatalog = await (await page.request.get('/api/exercise-catalog?limit=50')).json();
  expect(firstCatalog.total).toBe(94);
  const secondPage = await (await page.request.get('/api/exercise-catalog?limit=50&offset=50')).json();
  expect(firstCatalog.items.length + secondPage.items.length).toBe(94);
  await page.getByRole('link', { name: 'Editar treino ↗', exact: true }).click();
  await expect(page.getByLabel('Nome do exercício', { exact: true }).first()).toHaveValue('Supino reto com barra');
  await expect(page.getByText('Do catálogo compartilhado.', { exact: false })).toBeVisible();
  const other = await browser.newContext({ baseURL });
  try {
    const registration = await other.request.post('/api/auth/register', { headers: { 'X-Requested-With': 'OverLog' }, data: { name: 'Conta futura', email: `future-${randomUUID()}@example.com`, password: randomUUID() } });
    expect(registration.status()).toBe(201);
    expect(await (await other.request.get('/api/exercise-catalog?limit=50')).json()).toEqual(firstCatalog);
    expect(await (await other.request.get('/api/exercise-catalog?limit=50&offset=50')).json()).toEqual(secondPage);
    expect((await other.request.get(`/api/workouts/${workouts[0].id}`)).status()).toBe(404);
    expect((await (await other.request.get('/api/exercise-catalog', { params: { q: privateName } })).json()).total).toBe(0);
  } finally { await other.close(); }
});
