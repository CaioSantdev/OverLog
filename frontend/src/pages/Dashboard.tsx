import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Icon } from '../components/Icon';
import { BodyGraphic } from '../components/BodyGraphic';
import { VolumeChart, type WeekVolume } from '../components/VolumeChart';
import type { WorkoutSession } from '../types/session';
import type { Workout } from '../types/workout';

type Summary = { completed_sessions: number; sessions_this_week: number; progressions: number; week_days: number[]; weeks: WeekVolume[]; timezone: string };
function focus(workout: Workout): 'upper' | 'back' | 'legs' {
  const name = `${workout.name} ${workout.exercises[0]?.name || ''}`.toLowerCase();
  if (/perna|lower|agachamento|leg press|extensora|flexora|stiff|glúteo|panturrilha/.test(name)) return 'legs';
  return /pull|costas|remada|puxada|barra fixa/.test(name) ? 'back' : 'upper';
}
export function Dashboard({ workoutsOnly = false }: { workoutsOnly?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSummaryError('');
    Promise.all([api<Workout[]>('/workouts'), api<WorkoutSession | null>('/sessions/active')]).then(([data, session]) => { if (active) { setWorkouts(data); setActiveSession(session); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    if (!workoutsOnly) api<Summary>(`/dashboard?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      .then(value => { if (active) setSummary(value); }).catch(() => { if (active) setSummaryError('Não foi possível carregar seus indicadores.'); });
    return () => { active = false; };
  }, [attempt, workoutsOnly]);
  async function start(workoutId: string) {
    setStarting(true); setError('');
    try { const session = await api<WorkoutSession>('/sessions', { workout_template_id: workoutId }); navigate(`/sessoes/${session.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível iniciar o treino.'); }
    finally { setStarting(false); }
  }
  return <section className="workouts-page dashboard-page">
    {!workoutsOnly && <><div className="dashboard-greeting"><p className="eyebrow">SUA ROTINA, SUA EVOLUÇÃO</p><h1>Olá, {user?.name.split(' ')[0]}<span>.</span></h1><p>Pronto para mais um treino? Mantenha o foco e siga evoluindo.</p></div>
      {summary ? <div className="dashboard-stats"><Link to="/historico" className="stat-card"><span className="stat-icon"><Icon name="weights" size={26} /></span><div><p>Treinos realizados</p><strong>{summary.completed_sessions}</strong><small>Na sua jornada</small></div></Link><Link to="/historico" className="stat-card"><span className="stat-icon"><Icon name="calendar" size={26} /></span><div><p>Nesta semana</p><strong>{summary.sessions_this_week}<small>treinos</small></strong><div className="week-activity" aria-label="Dias com treinos nesta semana">{summary.week_days.map((count, index) => <span key={index} className={count > 0 ? 'trained' : ''} title={`${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][index]}: ${count} treinos`} />)}</div></div></Link><Link to="/evolucao" className="stat-card"><span className="stat-icon"><Icon name="trophy" size={26} /></span><div><p>Progressões</p><strong>{summary.progressions}</strong><small>Carga e repetições</small></div></Link></div> : summaryError ? <div className="notice" role="alert"><p>{summaryError}</p><button className="secondary small" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div> : <p className="hint" role="status">Carregando seus indicadores…</p>}</>}
    {activeSession && <aside className="active-session"><div><p className="eyebrow">SEU TREINO CONTINUA AQUI</p><h2>{activeSession.name_snapshot}</h2><p>{activeSession.completed_sets} séries concluídas</p></div><Link className="action" to={`/sessoes/${activeSession.id}`}><Icon name="play" />Retomar treino</Link></aside>}
    {error && <div className="notice" role="alert"><p>{error}</p><button className="secondary" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div>}
    <div className="workouts-title-row"><div>{workoutsOnly ? <h1 className="section-title">Meus treinos<span>.</span></h1> : <h2 className="section-title">Meus treinos<span>.</span></h2>}<p>Seus treinos salvos. Execute, edite e acompanhe sua evolução.</p></div>{!loading && workouts.length < 6 && <Link className="action" to="/treinos/novo">+ Criar treino</Link>}</div>
    {loading ? <p role="status">Carregando treinos…</p> : <>
      <p className="workout-counter">{workouts.length} de 6 treinos</p>
      {workouts.length === 6 && <p className="hint">Você atingiu o limite de seis treinos. Edite um existente ou exclua um para criar outro.</p>}
      {workouts.length === 0 && !error && <div className="empty-state"><Icon name="weights" size={40} /><h2>Seu primeiro treino começa aqui.</h2><p>Organize exercícios, séries, cargas e repetições em um plano que combina com você.</p><Link className="action" to="/treinos/novo">Montar meu treino</Link></div>}
      <div className="workout-grid">{workouts.map(workout => <article className="workout-card template-card" key={workout.id}><BodyGraphic focus={focus(workout)} /><div className="workout-card-content"><span className="eyebrow">TREINO {String.fromCharCode(65 + workout.position)}</span><h3>{workout.name}</h3><p className="workout-card-meta"><Icon name="layers" size={14} />{workout.exercises.length} exercícios<span>·</span>{workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)} séries</p><Link className="edit-link" to={`/treinos/${workout.id}`}>Editar treino ↗</Link></div><button type="button" className="start-workout" disabled={starting || Boolean(activeSession)} onClick={() => void start(workout.id)}>▶ Iniciar treino</button></article>)}</div>
    </>}
    {!workoutsOnly && summary && <VolumeChart weeks={summary.weeks} />}
    <nav className="workout-nav" aria-label="Acompanhar treinos"><Link to="/historico">Treinos concluídos ↗</Link><Link to="/evolucao">Evolução e conquistas ↗</Link></nav>
  </section>;
}
