import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

const getWindowLocation = () => {
  if (typeof window !== 'undefined') return window.location.href;
  return '';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ email: "user@monplanfin.ca", full_name: "Utilisateur", role: "user" });
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

  const logout = () => { setUser(null); setIsAuthenticated(false); };
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
