import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { mapUser, roleFromToken, type AppUser } from '@/api/usersClient';

type SignUpResult = ReturnType<typeof supabase.auth.signUp>;
type SignInResult = ReturnType<typeof supabase.auth.signInWithPassword>;
type OAuthResult = ReturnType<typeof supabase.auth.signInWithOAuth>;
type RecoverResult = ReturnType<typeof supabase.auth.resetPasswordForEmail>;
type UpdateResult = ReturnType<typeof supabase.auth.updateUser>;

export interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: null;
  appPublicSettings: null;
  authChecked: boolean;
  recoveryMode: boolean;
  logout: () => Promise<void>;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
  signUp: (email: string, password: string, full_name?: string) => SignUpResult;
  signIn: (email: string, password: string) => SignInResult;
  signInWithGoogle: () => OAuthResult;
  resetPassword: (email: string) => RecoverResult;
  updatePassword: (password: string) => UpdateResult;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  // Session réelle Supabase : lecture initiale + écoute des changements
  // (connexion, déconnexion, retour OAuth, confirmation d'email, récupération MDP).
  useEffect(() => {
    let monte = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!monte) return;
      setUser(mapUser(data.session?.user, roleFromToken(data.session?.access_token)));
      setIsLoadingAuth(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Arrivée via le lien « mot de passe oublié » → écran de nouveau mot de passe.
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      // roleFromToken = décodage SYNCHRONE du JWT (aucun appel async ici → pas de
      // deadlock dans onAuthStateChange, contrainte Supabase).
      setUser(mapUser(session?.user, roleFromToken(session?.access_token)));
      setIsLoadingAuth(false);
    });
    return () => { monte = false; sub.subscription.unsubscribe(); };
  }, []);

  // ── Méthodes d'authentification (Supabase Auth) ──────────────────────────
  const signUp = (email: string, password: string, full_name?: string): SignUpResult =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: full_name ? { full_name } : undefined,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    });

  const signIn = (email: string, password: string): SignInResult =>
    supabase.auth.signInWithPassword({ email, password });

  const signInWithGoogle = (): OAuthResult =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined },
    });

  const resetPassword = (email: string): RecoverResult =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
    });

  const updatePassword = async (password: string): UpdateResult => {
    const res = await supabase.auth.updateUser({ password });
    if (!res.error) setRecoveryMode(false);
    return res;
  };

  const logout = async (): Promise<void> => { await supabase.auth.signOut(); setUser(null); };
  const navigateToLogin = (): void => { if (typeof window !== 'undefined') window.location.href = '/login'; };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    authChecked: !isLoadingAuth,
    recoveryMode,
    logout,
    navigateToLogin,
    checkUserAuth: async () => {},
    checkAppState: async () => {},
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
