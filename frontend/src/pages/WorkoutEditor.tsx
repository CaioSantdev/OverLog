import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExerciseCatalog, type CatalogExercise } from '../components/ExerciseCatalog';
import { api } from '../services/api';
import { SET_TYPES, workoutInput, type Exercise, type PlannedSet, type Workout, type WorkoutInput } from '../types/workout';

type DraftSet = Omit<PlannedSet, 'target_repetitions'> & { target_repetitions: string; key: string };
type DraftExercise = Omit<Exercise, 'sets'> & { sets: DraftSet[]; key: string };
type Draft = { name: string; exercises: DraftExercise[] };
const key = () => crypto.randomUUID();
const newSet = (): DraftSet => ({ key: key(), set_type: 'work', target_repetitions: '10', target_weight: null });
function toDraft(workout: Workout): Draft {
  const input = workoutInput(workout);
  return { name: input.name, exercises: input.exercises.map(ex => ({ ...ex, key: key(), sets: ex.sets.map(set => ({ ...set, key: key(), target_repetitions: String(set.target_repetitions) })) })) };
}
function move<T>(items: T[], index: number, offset: number): T[] {
  const result = [...items];
  [result[index], result[index + offset]] = [result[index + offset], result[index]];
  return result;
}
export function WorkoutEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>({ name: '', exercises: [] });
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true); setError('');
    api<Workout>(`/workouts/${id}`).then(data => { if (active) { setDraft(toDraft(data)); setDirty(false); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(next: Draft) { setDraft(next); setDirty(true); }
  function exercise(index: number, next: DraftExercise) { change({ ...draft, exercises: draft.exercises.map((ex, i) => i === index ? next : ex) }); }
  function addCatalogExercise(item: CatalogExercise) {
    if (draft.exercises.length >= 100) return;
    change({ ...draft, exercises: [...draft.exercises, { key: key(), catalog_exercise_id: item.id, name: item.name, sets: [newSet()] }] });
    setCatalogOpen(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const input: WorkoutInput = { name: draft.name, exercises: draft.exercises.map(ex => ({ id: ex.id, catalog_exercise_id: ex.catalog_exercise_id ?? null, name: ex.name, sets: ex.sets.map(set => ({ id: set.id, set_type: set.set_type, target_repetitions: Number(set.target_repetitions), target_weight: set.target_weight === '' ? null : set.target_weight })) })) };
    try { await api<Workout>(id ? `/workouts/${id}` : '/workouts', input, id ? 'PUT' : 'POST'); setDirty(false); navigate('/'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar treino.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try { await api<void>(`/workouts/${id}`, undefined, 'DELETE'); setDirty(false); navigate('/'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao excluir treino.'); }
    finally { setBusy(false); }
  }
  if (loading) return <section className="workouts-page" role="status">Carregando treino…</section>;
  if (id && !draft.name && error) return <section className="workouts-page"><p role="alert">{error}</p><button onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button><Link to="/">Voltar aos treinos</Link></section>;
  return <section className="workouts-page editor">
    <Link to="/" onClick={e => { if (dirty && !window.confirm('Descartar as alterações não salvas?')) e.preventDefault(); }}>← Meus treinos</Link>
    <p className="eyebrow">MONTE SEU PLANO</p><h1 className="page-title">{id ? 'Editar treino' : 'Novo treino'}<span>.</span></h1>
    <p className="description">Organize seus exercícios na ordem em que você treina.</p>
    <form onSubmit={save}>
      <fieldset disabled={busy}>
        <label className="workout-name">Nome do treino<input name="name" required maxLength={100} value={draft.name} onChange={e => change({ ...draft, name: e.target.value })} placeholder="Ex.: Peito e tríceps" /></label>
        {draft.exercises.length === 0 && <div className="empty-state"><h2>Quais exercícios fazem parte do plano?</h2><p>Adicione o primeiro exercício e configure suas séries.</p></div>}
        {draft.exercises.map((ex, index) => <section className="exercise-card" key={ex.key}>
          <div className="section-heading"><p className="eyebrow">EXERCÍCIO {index + 1}</p><div className="inline-actions">
            <button type="button" className="secondary icon-button" disabled={index === 0} aria-label={`Subir exercício ${index + 1}`} onClick={() => change({ ...draft, exercises: move(draft.exercises, index, -1) })}>↑</button>
            <button type="button" className="secondary icon-button" disabled={index === draft.exercises.length - 1} aria-label={`Descer exercício ${index + 1}`} onClick={() => change({ ...draft, exercises: move(draft.exercises, index, 1) })}>↓</button>
            <button type="button" className="danger small" aria-label={`Remover exercício ${index + 1}`} onClick={() => exerciseRemove(index)}>Remover</button>
          </div></div>
          <label>Nome do exercício<input required maxLength={100} value={ex.name} onChange={e => exercise(index, { ...ex, name: e.target.value, catalog_exercise_id: null })} placeholder="Ex.: Supino reto" /></label>
          <p className="hint">{ex.catalog_exercise_id ? 'Do catálogo compartilhado. Alterar o nome transforma este item em manual.' : 'Exercício manual, disponível somente neste treino.'}</p>
          <div className="sets-list">{ex.sets.map((set, setIndex) => <div className="planned-set" key={set.key}>
            <div className="set-heading"><span>Série {setIndex + 1}</span><div className="inline-actions"><button type="button" className="secondary icon-button" disabled={setIndex === 0} aria-label={`Subir série ${setIndex + 1} do exercício ${index + 1}`} onClick={() => exercise(index, { ...ex, sets: move(ex.sets, setIndex, -1) })}>↑</button><button type="button" className="secondary icon-button" disabled={setIndex === ex.sets.length - 1} aria-label={`Descer série ${setIndex + 1} do exercício ${index + 1}`} onClick={() => exercise(index, { ...ex, sets: move(ex.sets, setIndex, 1) })}>↓</button><button type="button" className="danger small" aria-label={`Remover série ${setIndex + 1} do exercício ${index + 1}`} onClick={() => exercise(index, { ...ex, sets: ex.sets.filter((_, n) => n !== setIndex) })}>Remover</button></div></div>
            <div className="set-fields"><label>Tipo<select value={set.set_type} onChange={e => setChange(index, setIndex, { ...set, set_type: e.target.value as PlannedSet['set_type'] })}>{Object.entries(SET_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Repetições<input type="number" inputMode="numeric" required min="1" max="999" step="1" value={set.target_repetitions} onChange={e => setChange(index, setIndex, { ...set, target_repetitions: e.target.value })} /></label>
              <label>Carga (kg)<input type="number" inputMode="decimal" min="0" max="99999.99" step="0.01" placeholder="Opcional" value={set.target_weight ?? ''} onChange={e => setChange(index, setIndex, { ...set, target_weight: e.target.value || null })} /></label>
            </div>
          </div>)}</div>
          <button type="button" className="secondary" disabled={ex.sets.length >= 30} onClick={() => exercise(index, { ...ex, sets: [...ex.sets, newSet()] })}>+ Adicionar série</button>
        </section>)}
        <div className="exercise-add-actions"><button type="button" className="secondary" disabled={draft.exercises.length >= 100} aria-expanded={catalogOpen} onClick={() => setCatalogOpen(value => !value)}>Escolher do catálogo</button>
          <button type="button" className="secondary" disabled={draft.exercises.length >= 100} onClick={() => { setCatalogOpen(false); change({ ...draft, exercises: [...draft.exercises, { key: key(), name: '', catalog_exercise_id: null, sets: [newSet()] }] }); }}>+ Adicionar exercício</button></div>
        <p className="hint">Escolha um exercício existente ou use “Adicionar exercício” para digitar um nome manualmente.</p>
        {catalogOpen && <ExerciseCatalog onSelect={addCatalogExercise} onClose={() => setCatalogOpen(false)} />}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="save-bar"><p className="hint">{dirty ? 'Alterações ainda não salvas.' : 'Seu plano fica disponível para consultar e editar.'}</p><button type="submit">{busy ? 'Salvando…' : 'Salvar treino'}<span aria-hidden="true">↗</span></button></div>
      </fieldset>
    </form>
    {id && <section className="delete-section">{confirmDelete ? <><p>Excluir este treino e todos os seus exercícios e séries?</p><div className="inline-actions"><button type="button" className="danger" disabled={busy} onClick={remove}>Sim, excluir treino</button><button type="button" className="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button></div></> : <button type="button" className="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Excluir treino</button>}</section>}
  </section>;
  function setChange(exIndex: number, setIndex: number, next: DraftSet) { const ex = draft.exercises[exIndex]; exercise(exIndex, { ...ex, sets: ex.sets.map((s, n) => n === setIndex ? next : s) }); }
  function exerciseRemove(index: number) { change({ ...draft, exercises: draft.exercises.filter((_, n) => n !== index) }); }
}
