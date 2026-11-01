import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
  async function refresh() {
    setLoading(true); setError('');
    try { setUser(await api<User>('/auth/me')); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null);
      else setError(e instanceof Error ? e.message : 'Erro ao recuperar sessão.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  // Revalidate when returning to a tab: expiration or logout in another tab is reflected.
  useEffect(() => {
    const validate = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', validate);
    return () => document.removeEventListener('visibilitychange', validate);
  }, []);
  async function authenticate(mode: 'login' | 'register', data: { email: string; password: string; name?: string }) {
    setUser(await api<User>(`/auth/${mode}`, data));
  }
  async function logout() {
    try { await api<void>('/auth/logout', {}); }
    catch (e) { if (!(e instanceof ApiError && e.status === 401)) throw e; }
    setUser(null);
  }
  return <Context.Provider value={{ user, loading, error, refresh, authenticate, logout }}>{children}</Context.Provider>;
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('AuthProvider ausente');
  return auth;
}
