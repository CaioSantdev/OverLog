import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SessionElapsed } from '../components/SessionElapsed';
import { Icon } from '../components/Icon';
import { BodyGraphic } from '../components/BodyGraphic';
import { ProgressionPanel } from '../components/ProgressionPanel';
import { RestTimer, clearRestTimer } from '../components/RestTimer';
import { useAuth } from '../contexts/AuthContext';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { duration, type DraftSet } from '../types/session';
import { SetTypeBadge, SetTypeSelect } from '../components/SetType';

export function SessionPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const state = useWorkoutSession(id, user!.id);
  const { session, draft, loading, status, error, localWarning, closing, change, flush, close, reload } = state;
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  useEffect(() => {
    if (session && session.status !== 'in_progress') clearRestTimer(user!.id, session.id);
  }, [session?.id, session?.status, user?.id]);
  if (loading) return <section className="workouts-page" role="status">Recuperando seu treino…</section>;
  if (!session) return <section className="workouts-page"><p role="alert">{error}</p><button onClick={() => void reload()}>Tentar novamente</button><Link to="/">Meus treinos</Link></section>;
  const completed = draft.reduce((sum, ex) => sum + ex.sets.filter(set => set.is_completed).length, 0);
  const total = draft.reduce((sum, ex) => sum + ex.sets.length, 0);
  function updateSet(exIndex: number, index: number, next: DraftSet) {
    change(draft.map((ex, i) => i === exIndex ? { ...ex, sets: ex.sets.map((set, j) => j === index ? next : set) } : ex));
  }
  if (session.status !== 'in_progress') return <section className="workouts-page editor">
    <Link to="/">← Meus treinos</Link><p className="eyebrow">{session.status === 'completed' ? 'TREINO CONCLUÍDO' : 'SESSÃO DESCARTADA'}</p>
    <h1 className="page-title">{session.name_snapshot}<span>.</span></h1>
    <div className="session-stats"><div><strong>{session.completed_sets}</strong><span>Séries concluídas</span></div><div><strong>{duration(session.duration_seconds)}</strong><span>Duração</span></div></div>
    <p className="hint">Início: {new Date(session.started_at).toLocaleString('pt-BR')}<br />Término: {session.finished_at && new Date(session.finished_at).toLocaleString('pt-BR')}</p>
    {session.status === 'completed' && <ProgressionPanel key={session.id} sessionId={session.id} />}
    <h2>Registro detalhado</h2>
    {session.exercises.map(ex => <section className="exercise-card summary-exercise" key={ex.id}><h2>{ex.name_snapshot}</h2>{ex.sets.map((set, index) => <p className={set.is_completed ? '' : 'hint'} key={set.id}>Série {index + 1} · <SetTypeBadge value={set.set_type} /> · {set.weight ?? '—'} kg × {set.repetitions} rep. · {set.is_completed ? 'Concluída' : 'Não concluída'}</p>)}</section>)}
    <Link className="action" to="/">Voltar aos meus treinos</Link>
  </section>;
  const statuses = { saved: 'Tudo salvo no banco', pending: 'Alterações pendentes…', saving: 'Salvando…', error: 'Não foi possível salvar', conflict: 'Conflito de edição', invalid: 'Confira os campos para salvar' };
  function sessionActions(label: string) {
    return <fieldset className="session-actions" aria-label={label} disabled={closing || status === 'conflict'}>
      <button type="button" className="secondary" disabled={status === 'saving'} onClick={() => void flush()}>Salvar andamento</button>
      <button type="button" className="danger" onClick={() => setConfirm('discard')}>Descartar sessão</button>
      <button type="button" disabled={completed === 0 || status === 'invalid'} onClick={() => setConfirm('finish')}>Finalizar treino ↗</button>
    </fieldset>;
  }
  return <section className="workouts-page editor session-page">
    <Link className="session-back" to="/" aria-label="← Meus treinos (continuar depois)"><Icon name="arrow" size={16} />Meus treinos</Link><div className="session-title"><div><p className="eyebrow">TREINO EM ANDAMENTO</p><h1 className="page-title">{session.name_snapshot}<span>.</span></h1></div><span className="live-indicator">Em andamento</span></div>
    <p className="description">{completed} de {total} séries concluídas · Início às {new Date(session.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
    {sessionActions('Ações no topo da sessão')}
    <SessionElapsed startedAt={session.started_at} completed={completed} total={total} />
    <div className={`save-status ${status}`} role="status">{statuses[status]}</div>
    {localWarning && <p className="error" role="status">{localWarning}</p>}
    {error && <div className="notice" role="alert"><p>{error}</p>{status === 'conflict' ? <button type="button" className="secondary" onClick={() => { if (window.confirm('Descartar o rascunho local e carregar os dados salvos no servidor?')) void reload(true); }}>Carregar dados do servidor</button> : <button type="button" className="secondary" onClick={() => void flush()}>Tentar salvar novamente</button>}</div>}
    <fieldset className="session-fields" disabled={closing || status === 'conflict'}>
      {draft.map((ex, exIndex) => <section className="exercise-card execution-exercise" key={ex.id} aria-label={ex.name_snapshot}>
        <div className="execution-exercise-heading"><span className="exercise-number">{exIndex + 1}</span><div><h2>{ex.name_snapshot}</h2><p>{ex.sets.filter(item => item.is_completed).length} de {ex.sets.length} séries concluídas</p></div><BodyGraphic /></div>
        <div className="session-row-heading" aria-hidden="true"><span>Série</span><span>Tipo</span><span>Carga (kg)</span><span>Repetições</span><span>OK</span><span /></div>
        <div className="sets-list">{ex.sets.map((set, index) => <div className={`planned-set session-set ${set.is_completed ? 'completed-set' : ''}`} key={set.id}>
          <strong className="set-number" aria-label={`Série ${index + 1}`}>{index + 1}</strong>
          <SetTypeSelect label={`Tipo da série ${index + 1} de ${ex.name_snapshot}`} value={set.set_type} onChange={value => updateSet(exIndex, index, { ...set, set_type: value })} />
          <label className="session-input"><span className="sr-only">Carga (kg)</span><input aria-label="Carga (kg)" id={`weight-${set.id}`} type="text" inputMode="decimal" required={set.is_completed} aria-invalid={set.is_completed && set.weight.trim() === ''} aria-describedby={set.is_completed && set.weight.trim() === '' ? `weight-help-${set.id}` : `exercise-help-${ex.id}`} placeholder="—" value={set.weight} onChange={event => updateSet(exIndex, index, { ...set, weight: event.target.value })} /><span className="field-unit" aria-hidden="true">kg</span></label>
          <label className="session-input"><span className="sr-only">Repetições</span><input aria-label="Repetições" type="number" inputMode="numeric" min="0" max="999" step="1" required value={set.repetitions} onChange={event => updateSet(exIndex, index, { ...set, repetitions: event.target.value })} /><span className="field-unit" aria-hidden="true">rep</span></label>
          <label className="complete-toggle"><input type="checkbox" aria-label={`Série ${index + 1} concluída`} checked={set.is_completed} onChange={event => { updateSet(exIndex, index, { ...set, is_completed: event.target.checked }); if (event.target.checked && set.weight.trim() === '') document.getElementById(`weight-${set.id}`)?.focus(); }} /><span className="sr-only">Série {index + 1} concluída</span></label>
          <button type="button" className="remove-set" aria-label={`Remover série ${index + 1} de ${ex.name_snapshot}`} onClick={() => { if (!set.is_completed || window.confirm('Remover esta série já concluída?')) change(draft.map((item, i) => i === exIndex ? { ...item, sets: item.sets.filter(s => s.id !== set.id) } : item)); }}><Icon name="close" size={14} /></button>
          {set.is_completed && set.weight.trim() === '' && <p id={`weight-help-${set.id}`} className="error session-set-error">Informe a carga desta série para salvar a conclusão. Use 0 para peso corporal.</p>}
        </div>)}</div>
        <p className="hint exercise-help" id={`exercise-help-${ex.id}`}>Informe a carga para concluir. Use 0 para peso corporal. Aceita vírgula ou ponto.</p>
        <button type="button" className="secondary add-session-set" disabled={ex.sets.length >= 60} onClick={() => change(draft.map((item, i) => i === exIndex ? { ...item, sets: [...item.sets, { id: crypto.randomUUID(), position: item.sets.length, set_type: 'work', weight: '', repetitions: '10', is_completed: false }] } : item))}>+ Adicionar série</button>
      </section>)}
      <p className="hint">Seus registros são salvos nesta sessão. O plano original permanece disponível para o próximo treino.</p>
      {sessionActions('Ações no final da sessão')}
    </fieldset>
    <div className="session-rest-dock"><RestTimer key={`${user!.id}:${session.id}`} userId={user!.id} sessionId={session.id} disabled={closing} /></div>
    {confirm && <div className="confirmation" role="alertdialog" aria-modal="true" aria-labelledby="confirm-session-title"><div className="confirmation-card"><h2 id="confirm-session-title">{confirm === 'finish' ? 'Finalizar este treino?' : 'Descartar esta sessão?'}</h2><p>{confirm === 'finish' ? `${completed} de ${total} séries concluídas. As séries pendentes serão registradas como não concluídas.` : 'Esta sessão será encerrada sem entrar no histórico de treinos concluídos.'}</p><button disabled={closing} onClick={() => { void close(confirm).then(() => setConfirm(null)); }}>{closing ? 'Aguarde…' : confirm === 'finish' ? 'Sim, finalizar treino' : 'Sim, descartar sessão'}</button><button className="secondary" disabled={closing} onClick={() => setConfirm(null)}>Continuar treino</button></div></div>}
  </section>;
}
