import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, authenticate } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await authenticate(register ? 'register' : 'login', {
        email: String(data.get('email')), password: String(data.get('password')),
        ...(register ? { name: String(data.get('name')) } : {}),
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className="intro"><p className="eyebrow">UM REGISTRO. CADA EVOLUÇÃO.</p><h1>Track.<br />Lift.<br /><span>Evolve.</span></h1><p className="description">Seu próximo passo começa aqui. Entre na sua conta para acompanhar sua evolução.</p></section>
    <section className="card"><p className="eyebrow">SUA JORNADA NO OVERLOG</p><h2>{register ? 'Crie sua conta.' : 'Bom ter você de volta.'}</h2>
      <form onSubmit={submit}>
        {register && <label>Nome<input name="name" autoComplete="name" required minLength={1} maxLength={100} disabled={busy} /></label>}
        <label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} /></label>
        <label>Senha<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} aria-describedby={register ? 'password-help' : undefined} disabled={busy} /></label>
        {register && <p className="hint" id="password-help">Use entre 8 e 128 caracteres.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={busy} type="submit">{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}<span aria-hidden="true">↗</span></button>
      </form>
      <p className="auth-switch">{register ? 'Já tem uma conta? ' : 'Começando agora? '}<Link to={register ? '/login' : '/cadastro'}>{register ? 'Entrar' : 'Criar conta'}</Link></p>
    </section>
  </>;
}
