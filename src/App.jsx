import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Calculators from '@/pages/Calculators';
import Dashboard from '@/pages/Dashboard';
import Budget from '@/pages/Budget';
import Investments from '@/pages/Investments';
import FinancialPlan from '@/pages/FinancialPlan';
import FinancialAnalysis from '@/pages/FinancialAnalysis';
import FeuilleResume from '@/pages/FeuilleResume';
import AdvancedMode from '@/pages/AdvancedMode';
import StudioDecaissement from '@/pages/StudioDecaissement';

const PUBLIC_PATHS = ['/', '/calculatrices'];

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
        {/* Private routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/placements" element={<Investments />} />
        <Route path="/plan" element={<FinancialPlan />} />
        <Route path="/analyse" element={<FinancialAnalysis />} />
        <Route path="/resume" element={<FeuilleResume />} />
        <Route path="/avance" element={<AdvancedMode />} />
        <Route path="/modelisation" element={<StudioDecaissement />} />
        <Route path="/studio" element={<StudioDecaissement />} />
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