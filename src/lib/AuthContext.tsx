import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { mapUser } from '@/api/base44Client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Session réelle Supabase : lecture initiale + écoute des changements
  // (connexion, déconnexion, retour OAuth, confirmation d'email).
  useEffect(() => {
    let monte = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!monte) return;
      setUser(mapUser(data.session?.user));
      setIsLoadingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user));
      setIsLoadingAuth(false);
    });
    return () => { monte = false; sub.subscription.unsubscribe(); };
  }, []);

  // ── Méthodes d'authentification (Supabase Auth) ──────────────────────────
  const signUp = (email, password, full_name) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: full_name ? { full_name } : undefined,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    });

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined },
    });

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });

  const logout = async () => { await supabase.auth.signOut(); setUser(null); };
  const navigateToLogin = () => { if (typeof window !== 'undefined') window.location.href = '/login'; };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    authChecked: !isLoadingAuth,
    logout,
    navigateToLogin,
    checkUserAuth: async () => {},
    checkAppState: async () => {},
    // Auth réelle
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
