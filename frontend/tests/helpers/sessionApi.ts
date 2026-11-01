import type { Page } from '@playwright/test';

// Mock only the API: exercise the real React pages, validation and autosave hook.
export async function sessionApi(page: Page) {
  let count = 0;
  let active: any = null;
  const sessions = new Map<string, any>();
  const writes: any[] = [];
  let failNextSave = false;
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const respond = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/auth/me') return respond({ id: 'test-user', name: 'Teste', email: 'test@example.com', created_at: '2026-01-01T00:00:00Z' });
    if (path === '/api/workouts') return respond([{ id: 'plan', name: 'Plano sem carga', position: 0, exercises: [{ id: 'exercise', name: 'Supino', sets: [{}] }] }]);
    if (path === '/api/sessions/active') return respond(active);
    if (path === '/api/sessions' && method === 'POST') {
      count++;
      active = { id: `session-${count}`, name_snapshot: 'Plano sem carga', workout_template_id: 'plan', status: 'in_progress', revision: 0, last_mutation_id: null, started_at: '2026-01-01T10:00:00Z', finished_at: null, duration_seconds: null, completed_sets: 0,
        exercises: [{ id: `exercise-${count}`, name_snapshot: 'Supino', position: 0, sets: [{ id: `00000000-0000-4000-8000-${String(count).padStart(12, '0')}`, position: 0, set_type: 'work', weight: null, repetitions: 10, is_completed: false }] }] };
      sessions.set(active.id, active);
      return respond(active);
    }
    const id = path.split('/')[3];
    const session = sessions.get(id);
    if (!session) return respond({ detail: 'Sessão não encontrada.' }, 404);
    if (method === 'GET') return respond(session);
    if (method === 'PUT') {
      if (failNextSave) { failNextSave = false; return route.abort(); }
      const body = request.postDataJSON();
      if (body.revision !== session.revision) return respond({ detail: 'Conflito de revisão.' }, 409);
      if (body.exercises.some((ex: any) => ex.sets.some((set: any) => set.is_completed && set.weight === null))) return respond({ detail: 'Informe a carga.' }, 422);
      writes.push(body);
      session.revision++;
      session.last_mutation_id = body.mutation_id;
      session.exercises = session.exercises.map((ex: any, index: number) => ({ ...ex, sets: body.exercises[index].sets.map((set: any, position: number) => ({ ...set, position, weight: set.weight === null ? null : Number(set.weight).toFixed(2) })) }));
      session.completed_sets = session.exercises.reduce((sum: number, ex: any) => sum + ex.sets.filter((set: any) => set.is_completed).length, 0);
      return respond(session);
    }
    if (path.endsWith('/discard')) {
      session.status = 'discarded'; session.finished_at = '2026-01-01T10:05:00Z'; session.duration_seconds = 300; session.revision++; active = null; return respond(session);
    }
    if (path.endsWith('/finish')) {
      if (!session.completed_sets) return respond({ detail: 'Conclua uma série.' }, 422);
      session.status = 'completed'; session.finished_at = '2026-01-01T10:05:00Z'; session.duration_seconds = 300; session.revision++;
      active = null;
      return respond(session);
    }
    return respond({ detail: 'Rota inesperada no teste.' }, 500);
  });
  return { writes, failSave: () => { failNextSave = true; } };
}
