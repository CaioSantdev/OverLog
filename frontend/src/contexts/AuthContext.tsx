import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, type User } from '../services/api';

type Auth = {
  user: User | null; loading: boolean; error: string;
  refresh: () => Promise<void>;
  authenticate: (mode: 'login' | 'register', data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  async function refresh(background = false) {
    const requestVersion = ++version.current;
    if (!background) { setLoading(true); setError(''); }
    try { const current = await api<User>('/auth/me'); if (requestVersion === version.current) setUser(current); }
    catch (e) {
      if (requestVersion !== version.current) return;
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else if (!background) setError(e instanceof Error ? e.message : 'Erro ao recuperar sessão.');
    } finally { if (requestVersion === version.current) setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const clear = () => { version.current++; setUser(null); setLoading(false); };
    window.addEventListener('overlog:unauthorized', clear);
    return () => window.removeEventListener('overlog:unauthorized', clear);
  }, []);
  // Revalidate when returning to a tab: expiration or logout in another tab is reflected.
  useEffect(() => {
    const validate = () => { if (document.visibilityState === 'visible') void refresh(true); };
    document.addEventListener('visibilitychange', validate);
    return () => document.removeEventListener('visibilitychange', validate);
  }, []);
  async function authenticate(mode: 'login' | 'register', data: { email: string; password: string; name?: string }) {
    version.current++;
    const current = await api<User>(`/auth/${mode}`, data);
    version.current++; setUser(current); setLoading(false);
  }
  async function logout() {
    try { await api<void>('/auth/logout', {}); }
    catch (e) { if (!(e instanceof ApiError && e.status === 401)) throw e; }
    version.current++; setUser(null);
  }
  return <Context.Provider value={{ user, loading, error, refresh, authenticate, logout }}>{children}</Context.Provider>;
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('AuthProvider ausente');
  return auth;
}
