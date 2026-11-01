import { useEffect, useState } from 'react';

type TimerState = { elapsedMs: number; startedAt: number | null };
const initialState: TimerState = { elapsedMs: 0, startedAt: null };
export const restTimerKey = (userId: string, sessionId: string) => `overlog:rest:${userId}:${sessionId}`;
export function clearRestTimer(userId: string, sessionId: string) {
  try { localStorage.removeItem(restTimerKey(userId, sessionId)); } catch { /* No session data depends on timer storage. */ }
}
function readTimer(key: string): TimerState {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (value && Number.isFinite(value.elapsedMs) && value.elapsedMs >= 0 &&
        (value.startedAt === null || (Number.isFinite(value.startedAt) && value.startedAt >= 0))) {
      return { elapsedMs: value.elapsedMs, startedAt: value.startedAt };
    }
  } catch { /* A damaged or unavailable cache starts a fresh timer. */ }
  return initialState;
}
function elapsed(state: TimerState, now: number): number {
  return state.elapsedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}
function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
  if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
  return parts.map(value => String(value).padStart(2, '0')).join(':');
}

export function RestTimer({ userId, sessionId, disabled = false }: { userId: string; sessionId: string; disabled?: boolean }) {
  const key = restTimerKey(userId, sessionId);
  const [state, setState] = useState<TimerState>(() => readTimer(key));
  const [now, setNow] = useState(Date.now);
  const [warning, setWarning] = useState('');
  const running = state.startedAt !== null;
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) { setState(readTimer(key)); refresh(); }
    };
    const interval = window.setInterval(refresh, 250);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [key]);
  function save(next: TimerState) {
    setState(next); setNow(Date.now());
    try { localStorage.setItem(key, JSON.stringify(next)); setWarning(''); }
    catch { setWarning('O descanso funciona nesta tela, mas não será recuperado após recarregar.'); }
  }
  function toggle() {
    const timestamp = Date.now();
    save(running ? { elapsedMs: elapsed(state, timestamp), startedAt: null } : { ...state, startedAt: timestamp });
  }
  return <section className="rest-timer" aria-labelledby="rest-timer-title">
    <div className="rest-timer-heading"><div><h2 id="rest-timer-title"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v3" /></svg>Descanso</h2><p className="hint" role="status">{running ? 'Em contagem' : state.elapsedMs > 0 ? 'Pausado' : 'Pronto para começar'}</p></div>
      <output role="timer" aria-live="off" aria-label="Tempo de descanso" className="rest-timer-time">{formatTime(elapsed(state, now))}</output>
    </div>
    <div className="rest-timer-actions"><button type="button" onClick={toggle} disabled={disabled}>{running ? 'Pausar descanso' : state.elapsedMs > 0 ? 'Retomar descanso' : 'Iniciar descanso'}</button><button type="button" className="secondary" onClick={() => save({ elapsedMs: 0, startedAt: running ? Date.now() : null })} disabled={disabled}>Reiniciar descanso</button></div>
    {warning && <p className="error" role="status">{warning}</p>}
  </section>;
}
