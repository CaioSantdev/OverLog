import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icon';

export function ProfilePage() {
  const { user } = useAuth();
  return <section className="workouts-page editor profile-page"><p className="eyebrow">SUA CONTA</p><h1 className="page-title">Seu perfil<span>.</span></h1><div className="profile-card"><span className="profile-icon"><Icon name="user" size={30} /></span><h2>{user?.name}</h2><p className="account-email">{user?.email}</p><p className="hint">No OverLog desde {user && new Date(user.created_at).toLocaleDateString('pt-BR')}.</p><div className="hazard-stripe" /><Link className="action" to="/">Voltar aos meus treinos</Link></div></section>;
}
