import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { SET_TYPES, type PlannedSet } from '../types/workout';

type Comparison = { exercise_id: string; exercise_name: string; set_id: string; set_position: number; set_type: PlannedSet['set_type']; current_weight: string; current_repetitions: number; previous_session_id: string | null; previous_weight: string | null; previous_repetitions: number | null; outcome: 'weight_progress' | 'repetition_progress' | 'no_progress' | 'no_baseline' | 'not_comparable' | 'ambiguous' };
type Report = { policy_version: number; weight_progressions: number; repetition_progressions: number; compared_sets: number; comparisons: Comparison[] };
const outcomes = { weight_progress: 'Progressão de carga', repetition_progress: 'Progressão de repetições', no_progress: 'Sem progressão nesta série', no_baseline: 'Primeiro registro deste exercício', not_comparable: 'Sem série equivalente concluída', ambiguous: 'Nome repetido: comparação não realizada' };
function TrophyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a5 5 0 0 0 5 5M16 5h4v2a5 5 0 0 1-5 5M12 13v6M8 21h8M9 19h6" /></svg>;
}
const weight = (value: string) => value.replace('.', ',');
export function ProgressionPanel({ sessionId }: { sessionId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setReport(null); setError('');
    api<Report>(`/sessions/${sessionId}/progression`).then(data => { if (active) setReport(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [sessionId, attempt]);
  return <section className="progression-panel" aria-labelledby="progression-title">
    <p className="eyebrow">CADA EVOLUÇÃO CONTA</p><h2 id="progression-title">Evolução e conquistas</h2>
    {error ? <div className="notice" role="alert"><p>{error}</p><button className="secondary" onClick={() => setAttempt(n => n + 1)}>Tentar carregar comparação</button></div> : !report ? <p role="status">Comparando desempenho…</p> : <>
      {report.weight_progressions + report.repetition_progressions > 0 ? <div className="achievement-banner"><span className="trophy-icon"><TrophyIcon /></span><div><strong>Você evoluiu neste treino!</strong><p>{report.weight_progressions} progressões de carga · {report.repetition_progressions} progressões de repetições</p></div></div> : <p className="hint">{report.compared_sets > 0 ? 'Nem todo treino precisa de uma marca nova. Seus resultados estão registrados.' : 'Este treino ajuda a construir sua base. A comparação exige séries equivalentes em uma sessão anterior.'}</p>}
      <p className="hint">Compara séries do mesmo tipo e ordem com o registro anterior do exercício. Aquecimento e feeder não geram conquistas.</p>
      <div className="comparison-list">{report.comparisons.map(item => <article className={`comparison-card ${item.outcome.endsWith('_progress') ? 'achievement' : ''}`} key={item.set_id}>
        <div className="comparison-heading"><h3>{item.exercise_name}</h3><span className="hint">Série {item.set_position + 1} · {SET_TYPES[item.set_type]}</span></div>
        <p className="comparison-outcome">{item.outcome.endsWith('_progress') && <span className="trophy-icon"><TrophyIcon /></span>}{outcomes[item.outcome]}</p>
        <div className="comparison-values"><div><span>Anterior</span><strong>{item.previous_weight === null ? 'Sem referência' : `${weight(item.previous_weight)} kg × ${item.previous_repetitions}`}</strong></div><span aria-hidden="true">→</span><div><span>Atual</span><strong>{weight(item.current_weight)} kg × {item.current_repetitions}</strong></div></div>
        {item.previous_session_id && <Link to={`/sessoes/${item.previous_session_id}`}>Ver sessão de referência ↗</Link>}
      </article>)}</div>
      {report.comparisons.length === 0 && <p className="hint">Nenhuma série principal concluída com repetições suficientes para comparar.</p>}
    </>}
  </section>;
}
