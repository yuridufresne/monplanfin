import React, { createContext, useState, useContext, useEffect } from 'react';
import { getSessionUser, unlockAdmin, lockAdmin } from '@/api/base44Client';

const AuthContext = createContext(null);

// Déverrouillage admin via ?admin=courriel (validé contre l'allowlist).
// ?admin= (vide) repasse en mode client. Le param est ensuite retiré de l'URL.
const appliquerParamAdmin = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('admin')) return;
    const val = params.get('admin') || '';
    if (val) unlockAdmin(val); else lockAdmin();
    params.delete('admin');
    const reste = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (reste ? `?${reste}` : '') + window.location.hash);
  } catch { /* noop */ }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => { appliquerParamAdmin(); return getSessionUser(); });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  const checkAppState = async () => {};
  const checkUserAuth = async () => {};

  // Déconnexion = quitter le mode admin et repasser en client (pas de vraie session).
  const logout = () => { lockAdmin(); setUser(getSessionUser()); };
  const navigateToLogin = () => {};

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings, authChecked, logout, navigateToLogin, checkUserAuth, checkAppState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
