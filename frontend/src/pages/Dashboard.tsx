import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true); setError('');
    try { await logout(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível sair.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className="intro"><p className="eyebrow">ÁREA PRIVADA</p><h1>Olá,<br /><span className="user-name">{user?.name}.</span></h1><p className="description">Sua conta está pronta. Um treino de cada vez, uma evolução a cada registro.</p></section>
    <section className="card"><p className="eyebrow">MINHA CONTA</p><h2>Você está conectado.</h2><p className="account-email">{user?.email}</p><p>A criação de treinos chega na próxima etapa do OverLog.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy} onClick={leave}>{busy ? 'Saindo…' : 'Sair da conta'}<span aria-hidden="true">↗</span></button><p className="hint">Ao sair, as sessões desta conta são encerradas em todos os dispositivos.</p>
    </section>
  </>;
}
