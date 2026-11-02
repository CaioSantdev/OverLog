import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function SessionElapsed({ startedAt, completed, total }: { startedAt: string; completed: number; total: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, []);
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const elapsed = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
  return <div className="execution-stats"><div className="execution-time"><span className="stat-icon"><Icon name="clock" size={23} /></span><div><span>Tempo de treino</span><strong aria-label="Tempo decorrido do treino">{elapsed}</strong></div></div><div className="execution-progress"><span>Séries concluídas</span><strong>{completed}<small> de {total}</small></strong><div className="series-progress-bars" aria-label={`${completed} de ${total} séries concluídas`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={total > 0 && completed / total >= (index + 1) / 5 ? 'filled' : ''} />)}</div></div></div>;
}
