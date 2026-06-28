import { supabase } from './supabaseClient';
import { supabaseEntities } from './supabaseEntities';

// Allowlist admin. yuridufresne@gmail.com est le seul admin pour l'instant ;
// ajouter ici la secrétaire (assignation de dossiers) le moment venu.
export const ADMIN_EMAILS: string[] = ['yuridufresne@gmail.com'];

/** Identité applicative dérivée de la session Supabase. */
export interface AppUser {
  id?: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  type_compte?: 'directeur' | 'agent';
}

// Sous-ensemble du user Supabase qu'on consomme (évite un import de type fragile).
interface SupabaseAuthUser {
  id?: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string } | null;
}

/**
 * Mappe un user Supabase Auth vers la forme attendue par l'app. Le rôle admin
 * est dérivé du COURRIEL RÉEL authentifié (plus de hack localStorage ?admin=).
 */
export function mapUser(u: SupabaseAuthUser | null | undefined): AppUser | null {
  if (!u || !u.email) return null;
  const email = u.email;
  const isAdmin = ADMIN_EMAILS.includes(email);
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email,
    full_name: meta.full_name || meta.name || email,
    role: isAdmin ? 'admin' : 'user',
    type_compte: isAdmin ? 'directeur' : undefined,
  };
}

// Identité courante depuis la session Supabase (locale, pas de réseau).
const meAsync = async () => {
  const { data } = await supabase.auth.getSession();
  return mapUser(data.session?.user);
};

export const base44 = {
  auth: {
    me: meAsync,
    logout: () => supabase.auth.signOut(),
    redirectToLogin: () => { if (typeof window !== 'undefined') window.location.href = '/login'; },
    isAuthenticated: async () => {
      const { data } = await supabase.auth.getSession();
      return !!data.session;
    },
  },
  entities: {
    // Les admins sont exposés comme « directeurs » pour l'assignation de dossiers.
    User: {
      list: async () => ADMIN_EMAILS.map((e) => ({ email: e, full_name: 'Administrateur', role: 'admin', type_compte: 'directeur' })),
      me: meAsync,
    },
    ...supabaseEntities,
  },
  functions: {
    // Anciennes fonctions backend Base44 (canadaPostAddress, getStockPrice) absentes
    // après migration. On renvoie { data: {} } — et non null — pour que les appelants
    // (res.data.Items / res.data?.results / res.data?.price) dégradent sans planter.
    invoke: async () => ({ data: {} }),
  },
};
