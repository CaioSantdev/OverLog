import { test, expect, type Page } from '@playwright/test';
import { sessionApi } from './helpers/sessionApi';

const catalog = [
  { id: 'supino-barra', name: 'Supino reto com barra', muscle_group: 'Peito', equipment: 'Barra' },
  { id: 'supino-halteres', name: 'Supino reto com halteres', muscle_group: 'Peito', equipment: 'Halteres' },
  { id: 'rosca', name: 'Rosca alternada', muscle_group: 'Bíceps', equipment: 'Halteres' },
];
async function mockCatalog(page: Page) {
  await sessionApi(page);
  const saved: any[] = [];
  await page.route('**/api/exercise-catalog**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/filters')) return route.fulfill({ json: { muscle_groups: ['Peito', 'Bíceps'], equipment: ['Barra', 'Halteres'] } });
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const group = url.searchParams.get('muscle_group');
    const equipment = url.searchParams.get('equipment');
    const items = catalog.filter(item => item.name.toLowerCase().includes(q) && (!group || item.muscle_group === group) && (!equipment || item.equipment === equipment));
    return route.fulfill({ json: { items, total: items.length, offset: 0, limit: 20 } });
  });
  await page.route('**/api/workouts', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON(); saved.push(body);
    return route.fulfill({ status: 201, json: { ...body, id: 'saved', position: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } });
  });
  return saved;
}

test('escolhe do catálogo com filtros e salva junto de um exercício manual', async ({ page }) => {
  const saved = await mockCatalog(page);
  await page.goto('/treinos/novo');
  await page.getByLabel('Nome do treino', { exact: true }).fill('Treino misto');
  await page.getByRole('button', { name: 'Escolher do catálogo', exact: true }).click();
  await page.getByLabel('Buscar exercício', { exact: true }).fill('supino');
  await page.getByLabel('Buscar exercício', { exact: true }).press('Enter');
  expect(saved).toHaveLength(0);
  await page.getByRole('combobox', { name: 'Grupo muscular', exact: true }).selectOption('Peito');
  await page.getByRole('combobox', { name: 'Equipamento', exact: true }).selectOption('Halteres');
  await page.getByRole('button', { name: 'Adicionar Supino reto com halteres', exact: true }).click();
  await expect(page.getByLabel('Nome do exercício', { exact: true })).toHaveValue('Supino reto com halteres');
  await page.getByRole('button', { name: '+ Adicionar exercício', exact: true }).click();
  await page.getByLabel('Nome do exercício', { exact: true }).nth(1).fill('Minha variação pessoal');
  await page.getByRole('button', { name: 'Salvar treino', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meus treinos.' })).toBeVisible();
  expect(saved[0].exercises[0].catalog_exercise_id).toBe('supino-halteres');
  expect(saved[0].exercises[1].catalog_exercise_id).toBeNull();
  expect(saved[0].exercises[1].name).toBe('Minha variação pessoal');
});

test('busca vazia e erro permitem cadastro manual sem perder o treino', async ({ page }) => {
  const saved = await mockCatalog(page);
  await page.goto('/treinos/novo');
  await page.getByLabel('Nome do treino', { exact: true }).fill('Meu treino');
  await page.getByRole('button', { name: 'Escolher do catálogo', exact: true }).click();
  await page.getByLabel('Buscar exercício', { exact: true }).fill('não existe');
  await expect(page.getByText('Nenhum exercício encontrado.', { exact: false })).toBeVisible();
  await page.route('**/api/exercise-catalog?*', route => route.fulfill({ status: 503, json: { detail: 'Catálogo temporariamente indisponível.' } }));
  await page.getByLabel('Buscar exercício', { exact: true }).fill('supino');
  await expect(page.getByText('Catálogo temporariamente indisponível.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar catálogo', exact: true }).click();
  await page.getByRole('button', { name: '+ Adicionar exercício', exact: true }).click();
  await page.getByLabel('Nome do exercício', { exact: true }).fill('Exercício manual');
  await page.getByRole('button', { name: 'Salvar treino', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meus treinos.' })).toBeVisible();
  expect(saved[0].name).toBe('Meu treino');
  expect(saved[0].exercises[0].catalog_exercise_id).toBeNull();
});

test('renomear a escolha torna o exercício manual e o catálogo cabe no celular', async ({ page }) => {
  const saved = await mockCatalog(page);
  await page.goto('/treinos/novo');
  await page.getByLabel('Nome do treino', { exact: true }).fill('Personalizado');
  await page.getByRole('button', { name: 'Escolher do catálogo', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar Rosca alternada', exact: true }).waitFor();
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Adicionar Rosca alternada', exact: true }).click();
  await page.getByLabel('Nome do exercício', { exact: true }).fill('Minha rosca alternada');
  await page.getByRole('button', { name: 'Salvar treino', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meus treinos.' })).toBeVisible();
  expect(saved[0].exercises[0].catalog_exercise_id).toBeNull();
  expect(saved[0].exercises[0].name).toBe('Minha rosca alternada');
});
