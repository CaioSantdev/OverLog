import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icon';

const links = [
  { to: '/', name: 'Início', desktop: 'Dashboard', icon: 'home' },
  { to: '/treinos', name: 'Treinos', desktop: 'Meus treinos', icon: 'weights' },
  { to: '/historico', name: 'Histórico', desktop: 'Histórico', icon: 'calendar' },
  { to: '/evolucao', name: 'Evolução', desktop: 'Evolução', icon: 'chart' },
  { to: '/perfil', name: 'Perfil', desktop: 'Perfil', icon: 'user' },
];
export function AppFrame({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  async function leave() {
    setBusy(true); setError('');
    try { await logout(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível sair.'); }
    finally { setBusy(false); }
  }
  return <div className={`app-shell ${user ? 'authenticated' : 'auth-shell'}`}>
    <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
    {user && <aside className="sidebar">
      <Link className="brand" to="/"><img className="brand-symbol" src="/favicon.svg" alt="" width="28" height="28" />OverLog<span>.</span></Link>
      <p className="sidebar-label">ÁREA DE TREINO</p>
      <nav aria-label="Navegação principal">{links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'}><Icon name={link.icon} /><span>{link.desktop}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-manifesto"><span className="eyebrow">FOCO NO PRÓXIMO PASSO</span><strong>Mais um registro.<br />Mais uma evolução.</strong><div className="hazard-stripe" /></div><button className="logout-button" onClick={() => void leave()} disabled={busy}><Icon name="logout" />{busy ? 'Saindo…' : 'Sair'}</button></div>
    </aside>}
    <div className="app-main">
      <header className="app-header"><Link className="brand header-brand" to="/"><img className="brand-symbol" src="/favicon.svg" alt="" width="28" height="28" />OverLog<span>.</span></Link><span className="header-caption">SUA ROTINA. SUA EVOLUÇÃO.</span><div className="header-tools"><span className="phase">TRACK. LIFT. EVOLVE.</span>{user && <><button className="mobile-logout" aria-label="Sair" onClick={() => void leave()} disabled={busy}><Icon name="logout" /></button><Link className="avatar" to="/perfil" aria-label="Abrir perfil">{initials}</Link></>}</div></header>
      {error && <p className="frame-error" role="alert">{error}</p>}
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer><span>OverLog © {new Date().getFullYear()}</span><span>UM TREINO DE CADA VEZ.</span></footer>
    </div>
    {user && <nav className="mobile-nav" aria-label="Navegação do celular">{links.filter(link => link.to !== '/historico').map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'}><Icon name={link.icon} /><span>{link.name}</span></NavLink>)}</nav>}
  </div>;
}
