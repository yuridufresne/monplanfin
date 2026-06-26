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
import Home from '@/pages/Home';
import Calculators from '@/pages/Calculators';
import Dashboard from '@/pages/Dashboard';
import Budget from '@/pages/Budget';
import FinancialAnalysis from '@/pages/FinancialAnalysis';
import AnalyseABF from '@/pages/AnalyseABF';
import FeuilleResume from '@/pages/FeuilleResume';
import AdvancedMode from '@/pages/AdvancedMode';
import ProtectionAssurance from '@/pages/ProtectionAssurance';
import Immobilier from '@/pages/Immobilier';
import Conditions from '@/pages/Conditions';
import Confidentialite from '@/pages/Confidentialite';
import Methodologie from "@/pages/Methodologie";
import Contact from '@/pages/Contact';
import AdminDossiers from '@/pages/AdminDossiers';
import AdminFeedback from '@/pages/AdminFeedback';
import AgentDossiers from '@/pages/AgentDossiers';
import AgentDebug from '@/pages/AgentDebug';
import EducationFinanciere from '@/pages/EducationFinanciere';

const PUBLIC_PATHS = ['/', '/calculatrices'];

function PremiumGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem("mpf_studio_premium") === "1"; } catch (e) { return false; }
  });
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (code.trim().toLowerCase() === "monplanfin") {
      try { localStorage.setItem("mpf_studio_premium", "1"); } catch (e2) {}
      setUnlocked(true);
    } else {
      setErr(true);
    }
  };

  if (unlocked) return children;

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#050810" }}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center", padding: "40px 32px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,160,99,0.25)" }}>
        <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#C9A063", fontWeight: 700, marginBottom: 12 }}>Fonctionnalite Premium</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Studio de decaissement</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 24 }}>Strategies de retraite annee par annee. Acces reserve, entre ton code d'acces pour debloquer.</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }} placeholder="Code d'acces" style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid " + (err ? "#ef5e0b" : "rgba(255,255,255,0.15)"), color: "#fff", fontSize: 15, outline: "none", textAlign: "center" }} />
          {err && <span style={{ color: "#ef5e0b", fontSize: 13 }}>Code invalide.</span>}
          <button type="submit" style={{ padding: "12px 14px", borderRadius: 10, background: "#C9A063", color: "#050810", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}>Debloquer</button>
        </form>
      </div>
    </div>
  );
}

const AuthenticatedApp = () => {
  // One-time cleanup of duplicate debt entry
  useEffect(() => {
    base44.entities.Debt.delete("6a12333a6937d47618169cc7").catch(() => {});
  }, []);
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isPublicPath = PUBLIC_PATHS.includes(window.location.pathname);

  // Show loading spinner only for private routes
  if ((isLoadingPublicSettings || isLoadingAuth) && !isPublicPath) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#050810" }}>
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#C9A063] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required' && !isPublicPath) {
      // Only redirect to login for private routes
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public routes — always accessible */}
        <Route path="/" element={<Home />} />
        <Route path="/calculatrices" element={<Calculators />} />
          <Route path="/education" element={<EducationFinanciere />} />
        {/* Private routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/analyse" element={<AnalyseABF />} />
        <Route path="/analyse2" element={<AnalyseABF />} />
        <Route path="/analyse-classique" element={<FinancialAnalysis />} />
        <Route path="/resume" element={<FeuilleResume />} />
        <Route path="/avance" element={<AdvancedMode />} />
      
        <Route path="/protection" element={<ProtectionAssurance />} />
        <Route path="/immobilier" element={<Immobilier />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/methodologie" element={<Methodologie />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin/dossiers" element={<AdminDossiers />} />
        <Route path="/admin/feedback" element={<AdminFeedback />} />
        <Route path="/agent" element={<AgentDossiers />} />
        <Route path="/agent-debug" element={<AgentDebug />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App