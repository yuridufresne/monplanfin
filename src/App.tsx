import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import { Home, Calculators, Dashboard, Budget, AnalyseABF, FeuilleResume, AdvancedMode, ProtectionAssurance, Immobilier, Conditions, Confidentialite, Methodologie, Contact, AdminDossiers, AdminFeedback, AgentDossiers, AgentDebug, EducationFinanciere } from "./App-pages";
import FinancialPlan from '@/pages/FinancialPlan';
import Investments from '@/pages/Investments';
import StudioDecaissement from '@/pages/StudioDecaissement';

const PUBLIC_PATHS: string[] = ['/', '/calculatrices', '/education', '/contact', '/confidentialite', '/conditions', '/methodologie'];

function SoftWall({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === "STRATEGE2026") { localStorage.setItem("studio_decaissement_unlocked", "1"); onUnlock(); }
    else setErr(true);
  };
  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#050810" }}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: "40px 32px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,160,99,0.25)" }}>
        <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A063", fontWeight: 700, marginBottom: 12 }}>Fonctionnalité Premium</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Studio de décaissement</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 24 }}>Stratégies de retraite année par année. Accès réservé, entre ton code d'accès pour débloquer.</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }} placeholder="Code d'accès" style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid " + (err ? "#ef5e0b" : "rgba(255,255,255,0.15)"), color: "#fff", fontSize: 15, outline: "none", textAlign: "center" }} />
          {err && <span style={{ color: "#ef5e0b", fontSize: 13 }}>Code invalide.</span>}
          <button type="submit" style={{ padding: "12px 14px", borderRadius: 10, background: "#C9A063", color: "#050810", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>Débloquer</button>
        </form>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings, authChecked, logout, navigateToLogin, checkUserAuth } = useAuth();
  const [studioUnlocked, setStudioUnlocked] = useState(false);

  useEffect(() => { setStudioUnlocked(localStorage.getItem("studio_decaissement_unlocked") === "1"); }, []);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <div style={{ minHeight: "100vh", background: "#050810", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A063", fontSize: 14 }}>Chargement...</div>;
  }

  if (authError) return <UserNotRegisteredError error={authError} onRetry={checkUserAuth} />;
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#050810", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,160,99,0.25)" }}>
          <h2 style={{ color: "#fff", marginBottom: 16 }}>Bienvenue sur MonPlanFin</h2>
          <button onClick={navigateToLogin} style={{ padding: "12px 24px", background: "#C9A063", color: "#050810", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {PUBLIC_PATHS.map(path => (
        <Route key={path} path={path} element={<AppLayout logout={logout} user={user} />}>
          {path === '/' && <Route index element={<Home />} />}
          {path === '/calculatrices' && <Route index element={<Calculators />} />}
          {path === '/education' && <Route index element={<EducationFinanciere />} />}
          {path === '/contact' && <Route index element={<Contact />} />}
          {path === '/confidentialite' && <Route index element={<Confidentialite />} />}
          {path === '/conditions' && <Route index element={<Conditions />} />}
          {path === '/methodologie' && <Route index element={<Methodologie />} />}
        </Route>
      ))}
      <Route element={<AppLayout logout={logout} user={user} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/analyse" element={<AnalyseABF />} />
        <Route path="/analyse-classique" element={<AnalyseABF />} />
        <Route path="/resume" element={<FeuilleResume />} />
        <Route path="/avance" element={<AdvancedMode />} />
        <Route path="/protection" element={<ProtectionAssurance />} />
        <Route path="/immobilier" element={<Immobilier />} />
        <Route path="/plan-financier" element={<FinancialPlan />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/studio-decaissement" element={studioUnlocked ? <StudioDecaissement /> : <SoftWall onUnlock={() => setStudioUnlocked(true)} />} />
        <Route path="/admin/dossiers" element={<AdminDossiers />} />
        <Route path="/admin/feedback" element={<AdminFeedback />} />
        <Route path="/agent/dossiers" element={<AgentDossiers />} />
        <Route path="/agent/debug" element={<AgentDebug />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
