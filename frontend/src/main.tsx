import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { WorkoutEditor } from './pages/WorkoutEditor';
import { SessionPage } from './pages/SessionPage';
import { HistoryPage } from './pages/HistoryPage';
import { AppFrame } from './components/AppFrame';
import { ProfilePage } from './pages/ProfilePage';
import { Dashboard } from './pages/Dashboard';
import './styles/global.css';

function Protected() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
function App() {
  const { loading, error, refresh } = useAuth();
  return <AppFrame>
    {loading ? <section className="card" role="status">Recuperando sua sessão…</section> : error ? <section className="card"><p role="alert">{error}</p><button onClick={() => void refresh()}>Tentar novamente</button></section> :
      <Routes>
        <Route path="/login" element={<AuthPage key="login" />} />
        <Route path="/cadastro" element={<AuthPage key="register" register />} />
        <Route element={<Protected />}><Route path="/" element={<Dashboard />} /><Route path="/treinos" element={<Dashboard workoutsOnly />} /><Route path="/perfil" element={<ProfilePage />} /><Route path="/treinos/novo" element={<WorkoutEditor key="new" />} /><Route path="/treinos/:id" element={<WorkoutEditor />} /><Route path="/sessoes/:id" element={<SessionPage />} /><Route path="/historico" element={<HistoryPage />} /><Route path="/evolucao" element={<HistoryPage evolution />} /></Route>
        <Route path="*" element={<section className="card"><h2>Página não encontrada</h2><Link to="/">Voltar ao início</Link></section>} />
      </Routes>}
  </AppFrame>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>);
