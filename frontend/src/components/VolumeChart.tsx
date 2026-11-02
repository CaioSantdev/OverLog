import { useId, useState } from 'react';
import { Icon } from './Icon';

export type WeekVolume = { week_start: string; sessions: number; volume: string };
const number = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
export function VolumeChart({ weeks }: { weeks: WeekVolume[] }) {
  const [range, setRange] = useState(window.innerWidth < 600 ? 4 : 8);
  const gradient = useId().replace(/:/g, '');
  const data = weeks.slice(-range);
  const max = Math.max(1, ...data.map(week => Number(week.volume)));
  const points = data.map((week, index) => `${50 + index * 620 / Math.max(1, data.length - 1)},${160 - Number(week.volume) / max * 120}`);
  const any = data.some(week => week.sessions > 0);
  return <section className="volume-panel" aria-labelledby="volume-title">
    <div className="volume-heading"><div className="panel-title"><Icon name="chart" size={23} /><div><h2 id="volume-title">Evolução<span>.</span></h2><p>Volume registrado por semana · kg × repetições</p></div></div><div className="range-switch" role="group" aria-label="Período do gráfico">{[4, 8, 12].map(value => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)}>{value} semanas</button>)}</div></div>
    {any ? <div className="volume-content"><div className="chart-wrap"><svg viewBox="0 0 720 200" role="img" aria-label={`Volume de treino nas últimas ${range} semanas`}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.3" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3].map(index => <g key={index}><line x1="50" x2="680" y1={40 + index * 40} y2={40 + index * 40} className="chart-grid" /><text x="0" y={44 + index * 40}>{number(max * (3 - index) / 3)}</text></g>)}
      <polygon points={`50,170 ${points.join(' ')} 670,170`} fill={`url(#${gradient})`} />
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      {data.map((week, index) => <g key={week.week_start}><circle cx={50 + index * 620 / Math.max(1, data.length - 1)} cy={160 - Number(week.volume) / max * 120} r="4" fill="currentColor"><title>{new Date(`${week.week_start}T12:00:00`).toLocaleDateString('pt-BR')}: {number(Number(week.volume))} kg × repetições</title></circle><text x={50 + index * 620 / Math.max(1, data.length - 1)} y="192" textAnchor="middle">{new Date(`${week.week_start}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text></g>)}
    </svg></div><aside className="volume-summary"><p>Volume no período</p><strong>{number(data.reduce((sum, week) => sum + Number(week.volume), 0))}<small>kg × rep.</small></strong><span>{data.reduce((sum, week) => sum + week.sessions, 0)} treinos registrados</span></aside></div> : <div className="chart-empty"><Icon name="chart" size={34} /><p>Seu primeiro treino desenha essa evolução.</p><span>Os volumes aparecerão aqui após finalizar suas sessões.</span></div>}
    <div className="sr-only"><table><caption>Dados do gráfico de volume semanal</caption><thead><tr><th>Semana de início</th><th>Treinos</th><th>Volume em kg × repetições</th></tr></thead><tbody>{data.map(week => <tr key={week.week_start}><td>{week.week_start}</td><td>{week.sessions}</td><td>{week.volume}</td></tr>)}</tbody></table></div>
  </section>;
}
