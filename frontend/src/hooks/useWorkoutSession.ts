import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../services/api';
import { sessionDraft, validDraft, normalizedWeight, type DraftExercise, type WorkoutSession } from '../types/session';

type SaveBody = { revision: number; mutation_id: string; exercises: { id: string; sets: { id: string; set_type: string; weight: string | null; repetitions: number; is_completed: boolean }[] }[] };
type Pending = { body: SaveBody; generation: number };
type Cache = { revision: number; draft: DraftExercise[]; generation: number; saved: number; pending: Pending | null };
export function useWorkoutSession(id: string, userId: string) {
  const cacheKey = `overlog:session:${userId}:${id}`;
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'saved' | 'pending' | 'saving' | 'error' | 'conflict' | 'invalid'>('saved');
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [localWarning, setLocalWarning] = useState('');
  const loadSequence = useRef(0);
  const server = useRef<WorkoutSession | null>(null);
  const current = useRef<DraftExercise[]>([]);
  const generation = useRef(0), saved = useRef(0);
  const pending = useRef<Pending | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocked = useRef(false);
  function clearCache() { try { localStorage.removeItem(cacheKey); } catch { /* The server is already authoritative. */ } }
  function persist() {
    if (!server.current) return;
    try {
      if (saved.current === generation.current && !pending.current) localStorage.removeItem(cacheKey);
      else localStorage.setItem(cacheKey, JSON.stringify({ revision: server.current.revision, draft: current.current, generation: generation.current, saved: saved.current, pending: pending.current }));
    } catch { setLocalWarning('O navegador não permite guardar o rascunho local. Aguarde a confirmação de salvamento antes de sair ou recarregar.'); }
  }
  async function load(discardLocal = false) {
    const sequence = ++loadSequence.current;
    setLoading(true); setError('');
    try {
      const data = await api<WorkoutSession>(`/sessions/${id}`);
      if (sequence !== loadSequence.current) return;
      server.current = data; blocked.current = false;
      generation.current = 0; saved.current = 0; pending.current = null;
      let restored: Cache | null = null;
      try { if (!discardLocal) restored = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { /* Ignore unreadable cache. */ }
      current.current = sessionDraft(data);
      if (restored && data.status === 'in_progress' && Array.isArray(restored.draft) && Number.isInteger(restored.generation)) {
        current.current = restored.draft; generation.current = restored.generation; saved.current = restored.saved; pending.current = restored.pending;
        if (restored.pending && restored.pending.body.mutation_id === data.last_mutation_id) {
          saved.current = restored.pending.generation; pending.current = null;
          if (saved.current === generation.current) current.current = sessionDraft(data);
        } else if (restored.revision !== data.revision) {
          blocked.current = true; setStatus('conflict'); setError('Há alterações em outra aba. Seu rascunho está preservado, mas não foi enviado. Recarregue para usar os dados do servidor.');
        }
      }
      if (data.status !== 'in_progress' || discardLocal) {
        current.current = sessionDraft(data); generation.current = 0; saved.current = 0; pending.current = null;
        clearCache();
      }
      setSession(data); setDraft(current.current);
      if (!blocked.current) {
        setStatus(saved.current === generation.current ? 'saved' : 'pending');
        persist();
        if (saved.current !== generation.current) timer.current = setTimeout(() => void flush(), 500);
      }
    } catch (e) { if (sequence === loadSequence.current) setError(e instanceof Error ? e.message : 'Não foi possível recuperar a sessão.'); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }
  useEffect(() => {
    void load();
    const online = () => { if (!blocked.current) void flush(); };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (generation.current !== saved.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('online', online); window.addEventListener('beforeunload', beforeUnload);
    return () => {
      loadSequence.current += 1;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('online', online); window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [id, userId]);
  function change(next: DraftExercise[]) {
    current.current = next; generation.current += 1; setDraft(next); persist();
    if (blocked.current) return;
    setError(''); setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 500);
  }
  async function flush(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) { if (!await inFlight.current) return false; return flush(); }
    if (blocked.current || !server.current || server.current.status !== 'in_progress') return false;
    if (generation.current === saved.current && !pending.current) return true;
    if (!pending.current) {
      if (!validDraft(current.current)) { setStatus('invalid'); setError('Preencha repetições inteiras e cargas válidas. Séries concluídas precisam de carga (use zero para peso corporal).'); return false; }
      pending.current = { generation: generation.current, body: {
        revision: server.current.revision, mutation_id: crypto.randomUUID(),
        exercises: current.current.map(ex => ({ id: ex.id, sets: ex.sets.map(set => ({ id: set.id, set_type: set.set_type, weight: set.weight.trim() ? normalizedWeight(set.weight) : null, repetitions: Number(set.repetitions), is_completed: set.is_completed })) })),
      } };
      persist();
    }
    const request = pending.current;
    setStatus('saving'); setError('');
    const promise = (async () => {
      try {
        const data = await api<WorkoutSession>(`/sessions/${id}`, request.body, 'PUT');
        server.current = data; saved.current = request.generation; pending.current = null;
        setSession(data);
        if (saved.current === generation.current) { current.current = sessionDraft(data); setDraft(current.current); }
        persist(); setStatus(saved.current === generation.current ? 'saved' : 'pending');
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) { blocked.current = true; setStatus('conflict'); }
        else setStatus('error');
        setError(e instanceof Error ? e.message : 'Erro ao salvar. Seu rascunho está preservado.');
        return false;
      }
    })();
    inFlight.current = promise;
    const result = await promise;
    if (inFlight.current === promise) inFlight.current = null;
    if (result && generation.current !== saved.current) return flush();
    return result;
  }
  async function close(action: 'finish' | 'discard') {
    setClosing(true); setError('');
    try {
      if (action === 'finish' && !await flush()) return;
      if (action === 'discard' && inFlight.current) await inFlight.current;
      if (!server.current) return;
      const data = await api<WorkoutSession>(`/sessions/${id}/${action}`, { revision: server.current.revision });
      server.current = data; current.current = sessionDraft(data); pending.current = null;
      saved.current = generation.current; clearCache();
      setSession(data); setDraft(current.current); setStatus('saved');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { blocked.current = true; setStatus('conflict'); }
      setError(e instanceof Error ? e.message : 'Não foi possível encerrar a sessão.');
    } finally { setClosing(false); }
  }
  return { session, draft, loading, status, error, localWarning, closing, change, flush, close, reload: (discard = false) => load(discard) };
}
