import { test, expect, type Page } from '@playwright/test';
import { sessionApi } from './helpers/sessionApi';

async function openSession(page: Page) {
  await page.clock.install({ time: new Date('2026-11-01T15:00:00Z') });
  const api = await sessionApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await expect(page.getByRole('timer', { name: 'Tempo de descanso' })).toHaveText('00:00');
  await page.clock.pauseAt(new Date('2026-11-01T15:00:05Z'));
  return api;
}

test('inicia, pausa, retoma e reinicia sem alterar séries', async ({ page }) => {
  const api = await openSession(page);
  const timer = page.getByRole('timer');
  await page.getByRole('button', { name: 'Iniciar descanso', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(timer).toHaveText('00:05');
  await page.getByRole('button', { name: 'Pausar descanso', exact: true }).click();
  await page.clock.runFor(20000);
  await expect(timer).toHaveText('00:05');
  await page.getByRole('button', { name: 'Retomar descanso', exact: true }).click();
  await page.clock.runFor(3000);
  await expect(timer).toHaveText('00:08');
  await page.getByRole('button', { name: 'Reiniciar descanso', exact: true }).click();
  await expect(timer).toHaveText('00:00');
  await page.clock.runFor(2000);
  await expect(timer).toHaveText('00:02');
  await page.getByRole('button', { name: 'Pausar descanso', exact: true }).click();
  await page.getByRole('button', { name: 'Reiniciar descanso', exact: true }).click();
  await page.clock.runFor(10000);
  await expect(timer).toHaveText('00:00');
  await expect(page.getByRole('button', { name: 'Iniciar descanso', exact: true })).toBeVisible();
  expect(api.writes).toHaveLength(0);
  await expect(page.getByLabel('Repetições', { exact: true })).toHaveValue('10');
});

test('recupera o tempo após suspensão, recarga e retomada da sessão', async ({ page }) => {
  await openSession(page);
  await page.getByRole('button', { name: 'Iniciar descanso', exact: true }).click();
  // A suspended browser fires due callbacks once, rather than every elapsed tick.
  await page.clock.fastForward('05:00');
  await expect(page.getByRole('timer')).toHaveText('05:00');
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText('05:00');
  await page.getByRole('button', { name: 'Pausar descanso', exact: true }).click();
  await page.clock.fastForward('02:00');
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText('05:00');
  await page.getByRole('button', { name: 'Retomar descanso', exact: true }).click();
  await page.getByRole('link', { name: '← Meus treinos (continuar depois)', exact: true }).click();
  // Let the real mocked requests settle before advancing the browser's timeout clock.
  await expect(page.getByRole('link', { name: 'Retomar treino', exact: true })).toBeVisible();
  await page.clock.fastForward('01:00');
  await page.getByRole('link', { name: 'Retomar treino', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('06:00');
});

test('limpa o descanso ao finalizar e começa zerado na próxima sessão', async ({ page }) => {
  const api = await openSession(page);
  await page.getByRole('button', { name: 'Iniciar descanso', exact: true }).click();
  await page.clock.runFor(1000);
  await page.getByLabel('Carga (kg)', { exact: true }).fill('20,5');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Salvar andamento', exact: true }).first().click();
  await expect(page.getByText('Tudo salvo no banco', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar treino ↗', exact: true }).first().click();
  await page.getByRole('button', { name: 'Sim, finalizar treino', exact: true }).click();
  await expect(page.getByText('TREINO CONCLUÍDO', { exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('overlog:rest:test-user:session-1'))).toBeNull();
  expect(api.writes.at(-1).exercises[0].sets[0].weight).toBe('20.5');
  await page.getByRole('link', { name: 'Voltar aos meus treinos', exact: true }).click();
  await page.getByRole('button', { name: '▶ Iniciar treino', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('00:00');
});

test('limpa o descanso após descarte confirmado', async ({ page }) => {
  await openSession(page);
  await page.getByRole('button', { name: 'Iniciar descanso', exact: true }).click();
  await page.clock.runFor(1000);
  await page.getByRole('group', { name: 'Ações no final da sessão', exact: true }).getByRole('button', { name: 'Descartar sessão', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, descartar sessão', exact: true }).click();
  await expect(page.getByText('SESSÃO DESCARTADA', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('overlog:rest:test-user:session-1'))).toBeNull();
});

test('mantém controles acessíveis em telas pequenas e informa armazenamento indisponível', async ({ page }) => {
  await openSession(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('overlog:rest:')) throw new Error('storage unavailable');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Iniciar descanso', exact: true }).click();
  await page.clock.fastForward('02:01:01');
  await expect(page.getByRole('timer')).toHaveText('02:01:01');
  await expect(page.getByText('O descanso funciona nesta tela, mas não será recuperado após recarregar.')).toBeVisible();
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Pausar descanso', exact: true })).toBeEnabled();
  }
});
