import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import SeoManager from '@/lib/SeoManager';
import CookieConsent from '@/components/ui/CookieConsent';
import { Home, Calculators, Dashboard, Budget, AnalyseABF, FeuilleResume, AdvancedMode, ProtectionAssurance, Immobilier, Conditions, Confidentialite, Methodologie, Contact, AdminDossiers, AdminEquipe, AdminKpi, AdminFeedback, AgentDossiers, EducationFinanciere } from "./App-pages";
import FinancialPlan from '@/pages/FinancialPlan';
import Investments from '@/pages/Investments';
import StudioDecaissement from '@/pages/StudioDecaissement';
import { supabase } from '@/api/supabaseClient';
import { captureAttribution, syncAttributionCompte } from '@/lib/attribution';
import DisclaimerAMF from '@/components/DisclaimerAMF';

// Pages de RÉSULTATS : avertissement AMF « pas un conseil personnalisé » en bas.
// (PAS sur /analyse ni les pages publiques.)
function AvecDisclaimer({ children }: { children: React.ReactNode }) {
  return <>{children}<DisclaimerAMF /></>;
}

function SoftWall({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(false); setBusy(true);
    try {
      // Validation SERVEUR : le code est vérifié EN BASE (RPC SECURITY DEFINER),
      // jamais dans le bundle. En cas de succès, l'entitlement est inséré côté
      // serveur pour auth.uid() ; le front ne fait que relire son droit.
      const { data, error } = await supabase.rpc("redeem_studio_code", { p_code: code.trim() });
      if (error) throw error;
      if (data === true) onUnlock();
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#050810" }}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: "40px 32px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,160,99,0.25)" }}>
        <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A063", fontWeight: 700, marginBottom: 12 }}>Fonctionnalité Premium</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Studio de décaissement</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 24 }}>Stratégies de retraite année par année. Accès réservé, entre ton code d'accès pour débloquer.</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={code} disabled={busy} onChange={(e) => { setCode(e.target.value); setErr(false); }} placeholder="Code d'accès" style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid " + (err ? "#ef5e0b" : "rgba(255,255,255,0.15)"), color: "#fff", fontSize: 15, outline: "none", textAlign: "center" }} />
          {err && <span style={{ color: "#ef5e0b", fontSize: 13 }}>Code invalide.</span>}
          <button type="submit" disabled={busy} style={{ padding: "12px 14px", borderRadius: 10, background: "#C9A063", color: "#050810", fontWeight: 700, fontSize: 15, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Vérification…" : "Débloquer"}</button>
        </form>
      </div>
    </div>
  );
}

// Garde de routes privées : redirige vers /login si pas de session.
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoadingAuth, recoveryMode, user } = useAuth();
  const isAdmin = user?.role === "admin"; // accès Studio sans entitlement (travail interne)
  const [studioUnlocked, setStudioUnlocked] = useState(false);
  const [studioChecked, setStudioChecked] = useState(false);

  // [P1b] Attribution first-touch : capter l'origine (UTM/referrer) au chargement,
  // puis la rattacher UNE fois au compte dès qu'une session existe.
  useEffect(() => { captureAttribution(); }, []);
  useEffect(() => { if (isAuthenticated) syncAttributionCompte(); }, [isAuthenticated]);

  // Entitlement Studio lu côté SERVEUR : via la RLS, l'utilisateur ne voit que
  // sa propre ligne. Plus de flag localStorage contournable côté client.
  useEffect(() => {
    let alive = true;
    if (!isAuthenticated) { setStudioUnlocked(false); setStudioChecked(true); return; }
    setStudioChecked(false);
    supabase.from("studio_entitlement").select("user_id").maybeSingle()
      .then(({ data }) => { if (alive) { setStudioUnlocked(!!data); setStudioChecked(true); } });
    return () => { alive = false; };
  }, [isAuthenticated]);

  if (isLoadingAuth) {
    return <div style={{ minHeight: "100vh", background: "#050810", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A063", fontSize: 14 }}>Chargement...</div>;
  }

  // Arrivée via le lien de réinitialisation : écran « nouveau mot de passe »
  // prioritaire sur tout le routage (une session temporaire est active).
  if (recoveryMode) return <ResetPassword />;

  return (
    <Routes>
      {/* Connexion — si déjà connecté, file vers le tableau de bord */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Pages publiques — accessibles à tous, connecté ou non */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calculatrices" element={<Calculators />} />
        <Route path="/education" element={<EducationFinanciere />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="/methodologie" element={<Methodologie />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>

      {/* Pages privées — connexion requise */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<AvecDisclaimer><Dashboard /></AvecDisclaimer>} />
          <Route path="/analyse" element={<AnalyseABF />} />
          <Route path="/analyse-classique" element={<AnalyseABF />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/resume" element={<AvecDisclaimer><FeuilleResume /></AvecDisclaimer>} />
          <Route path="/avance" element={<AvecDisclaimer><AdvancedMode /></AvecDisclaimer>} />
          <Route path="/protection" element={<AvecDisclaimer><ProtectionAssurance /></AvecDisclaimer>} />
          <Route path="/immobilier" element={<AvecDisclaimer><Immobilier /></AvecDisclaimer>} />
          <Route path="/plan-financier" element={<FinancialPlan />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/studio-decaissement" element={
            isAdmin
              ? <StudioDecaissement />
              : !studioChecked
                ? <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A063", fontSize: 14, background: "#050810" }}>Chargement…</div>
                : studioUnlocked
                  ? <StudioDecaissement />
                  : <SoftWall onUnlock={() => setStudioUnlocked(true)} />
          } />
          <Route path="/admin/dossiers" element={<AdminDossiers />} />
          <Route path="/admin/equipe" element={<AdminEquipe />} />
          <Route path="/admin/kpi" element={<AdminKpi />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/agent/dossiers" element={<AgentDossiers />} />
        </Route>
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
            <SeoManager />
            <AuthenticatedApp />
            <CookieConsent />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
