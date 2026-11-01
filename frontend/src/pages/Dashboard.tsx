import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { WorkoutSession } from '../types/session';
import type { Workout } from '../types/workout';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([api<Workout[]>('/workouts'), api<WorkoutSession | null>('/sessions/active')]).then(([data, session]) => { if (active) { setWorkouts(data); setActiveSession(session); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  async function leave() {
    setBusy(true); setError('');
    try { await logout(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível sair.'); }
    finally { setBusy(false); }
  }
  async function start(workoutId: string) {
    setStarting(true); setError('');
    try { const session = await api<WorkoutSession>('/sessions', { workout_template_id: workoutId }); navigate(`/sessoes/${session.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível iniciar o treino.'); }
    finally { setStarting(false); }
  }
  return <section className="workouts-page">
    <div className="page-heading"><div><p className="eyebrow">SUA ROTINA, SUA EVOLUÇÃO</p><h1 className="page-title">Meus treinos<span>.</span></h1><p className="description">Olá, {user?.name}. Prepare seu próximo treino.</p></div><button className="secondary small" onClick={leave} disabled={busy}>{busy ? 'Saindo…' : 'Sair'}</button></div>
    <nav className="workout-nav"><Link to="/historico">Treinos concluídos ↗</Link><Link to="/evolucao">Evolução e conquistas ↗</Link></nav>
    {activeSession && <aside className="active-session"><div><p className="eyebrow">TREINO EM ANDAMENTO</p><h2>{activeSession.name_snapshot}</h2><p>{activeSession.completed_sets} séries concluídas</p></div><Link className="action" to={`/sessoes/${activeSession.id}`}>Retomar treino</Link></aside>}
    {error && <div className="notice" role="alert"><p>{error}</p><button className="secondary" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div>}
    {loading ? <p role="status">Carregando treinos…</p> : <>
      <div className="section-heading"><p>{workouts.length} de 6 treinos</p>{workouts.length < 6 && <Link className="action" to="/treinos/novo">+ Criar treino</Link>}</div>
      {workouts.length === 6 && <p className="hint">Você atingiu o limite de seis treinos. Edite um existente ou exclua um para criar outro.</p>}
      {workouts.length === 0 && !error && <div className="empty-state"><span aria-hidden="true">↗</span><h2>Seu primeiro treino começa aqui.</h2><p>Organize exercícios, séries, cargas e repetições em um plano que combina com você.</p><Link className="action" to="/treinos/novo">Montar meu treino</Link></div>}
      <div className="workout-grid">{workouts.map(workout => <article className="workout-card" key={workout.id}><span className="eyebrow">TREINO {String.fromCharCode(65 + workout.position)}</span><h2>{workout.name}</h2><p>{workout.exercises.length} exercícios · {workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} séries</p><Link className="edit-link" to={`/treinos/${workout.id}`}>Editar treino ↗</Link><button type="button" className="start-workout" disabled={starting || Boolean(activeSession)} onClick={() => void start(workout.id)}>▶ Iniciar treino</button></article>)}</div>
    </>}
  </section>;
}
