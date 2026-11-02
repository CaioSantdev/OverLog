import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
  weights: <><path d="M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  chart: <><path d="m3 17 6-6 4 3 8-10M15 4h6v6" /></>,
  trophy: <><path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v2a5 5 0 0 0 5 5M16 5h4v2a5 5 0 0 1-5 5M12 13v6M8 21h8M9 19h6" /></>,
  user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-3a8 8 0 0 1 16 0v3Z" /></>,
  logout: <><path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>,
  play: <path d="m8 5 11 7-11 7Z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  reset: <><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  arrow: <path d="m14 5-7 7 7 7M7 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  layers: <><path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5" /></>,
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.weights}</svg>;
}
