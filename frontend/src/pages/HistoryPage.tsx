import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { duration, type SessionSummary } from '../types/session';

export function HistoryPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    api<SessionSummary[]>(`/sessions?offset=${offset}&limit=20`).then(data => { if (active) { setSessions(previous => offset === 0 ? data : [...previous, ...data.filter(item => !previous.some(old => old.id === item.id))]); setMore(data.length === 20); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [offset, attempt]);
  return <section className="workouts-page"><Link to="/">← Meus treinos</Link><p className="eyebrow">UM REGISTRO A CADA TREINO</p><h1 className="page-title">Treinos concluídos<span>.</span></h1>
    {error && <div className="notice" role="alert"><p>{error}</p><button onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div>}
    <div className="workout-grid">{sessions.map(session => <Link className="workout-card" key={session.id} to={`/sessoes/${session.id}`}><p className="eyebrow">{new Date(session.started_at).toLocaleDateString('pt-BR')}</p><h2>{session.name_snapshot}</h2><p>{session.completed_sets} séries concluídas · {duration(session.duration_seconds)}</p><span className="edit-link">Ver resumo ↗</span></Link>)}</div>
    {loading && <p role="status">Carregando sessões…</p>}{!loading && !error && sessions.length === 0 && <div className="empty-state"><h2>Seu histórico começa no próximo treino.</h2><p>Inicie um dos seus planos e registre suas séries.</p></div>}
    {more && !error && <button className="secondary" disabled={loading} onClick={() => setOffset(value => value + 20)}>Carregar mais</button>}
  </section>;
}
