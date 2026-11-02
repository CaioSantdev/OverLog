import { useEffect, useState } from 'react';
import { api } from '../services/api';

export type CatalogExercise = { id: string; name: string; muscle_group: string; equipment: string };
type CatalogPage = { items: CatalogExercise[]; total: number; offset: number; limit: number };
type Filters = { muscle_groups: string[]; equipment: string[] };

export function ExerciseCatalog({ onSelect, onClose }: { onSelect: (item: CatalogExercise) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CatalogPage | null>(null);
  const [filters, setFilters] = useState<Filters>({ muscle_groups: [], equipment: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setFilterError('');
    api<Filters>('/exercise-catalog/filters').then(value => { if (active) setFilters(value); })
      .catch(() => { if (active) setFilterError('Os filtros não puderam ser carregados. A busca por texto continua disponível.'); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const params = new URLSearchParams({ q: query, offset: String(offset), limit: '20' });
    if (group) params.set('muscle_group', group);
    if (equipment) params.set('equipment', equipment);
    const timeout = window.setTimeout(() => {
      api<CatalogPage>(`/exercise-catalog?${params}`).then(value => { if (active) setData(value); })
        .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query, group, equipment, offset, attempt]);
  return <section className="exercise-catalog" aria-label="Catálogo compartilhado de exercícios">
    <div className="section-heading"><div><p className="eyebrow">DISPONÍVEL PARA TODOS</p><h2>Catálogo de exercícios</h2></div><button type="button" className="secondary small" onClick={onClose}>Fechar catálogo</button></div>
    <label>Buscar exercício<input type="search" autoComplete="off" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setOffset(0); }} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} placeholder="Ex.: supino, remada, bíceps" /></label>
    <div className="catalog-filters">
      <label>Grupo muscular<select aria-label="Grupo muscular" value={group} onChange={event => { setGroup(event.target.value); setOffset(0); }}><option value="">Todos os grupos</option>{filters.muscle_groups.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Equipamento<select aria-label="Equipamento" value={equipment} onChange={event => { setEquipment(event.target.value); setOffset(0); }}><option value="">Todos os equipamentos</option>{filters.equipment.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    {filterError && <p className="hint" role="status">{filterError} <button type="button" className="secondary" onClick={() => setAttempt(value => value + 1)}>Tentar carregar filtros</button></p>}
    {loading ? <p role="status">Buscando exercícios…</p> : error ? <div className="notice" role="alert"><p>{error}</p><button type="button" className="secondary" onClick={() => setAttempt(value => value + 1)}>Tentar carregar catálogo</button></div> : data && <>
      <p className="hint" role="status">{data.total} exercícios encontrados</p>
      <ul className="catalog-results">{data.items.map(item => <li key={item.id}><div><strong>{item.name}</strong><span>{item.muscle_group} · {item.equipment}</span></div><button type="button" className="secondary small" aria-label={`Adicionar ${item.name}`} onClick={() => onSelect(item)}>Adicionar</button></li>)}</ul>
      {data.items.length === 0 && <p>Nenhum exercício encontrado. Ajuste os filtros ou feche o catálogo e adicione manualmente.</p>}
      <div className="catalog-pagination"><button type="button" className="secondary" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 20))}>Página anterior</button><button type="button" className="secondary" disabled={offset + data.items.length >= data.total} onClick={() => setOffset(value => value + 20)}>Próxima página</button></div>
    </>}
  </section>;
}
