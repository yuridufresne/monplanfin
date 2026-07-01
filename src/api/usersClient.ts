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
 * Lit le claim métier `type_compte` injecté dans le JWT par le Custom Access
 * Token Hook Supabase (cf. supabase_team_member.sql). Source de vérité signée
 * côté serveur — on ne fait que la DÉCODER ici (la RLS reste le vrai garde-fou).
 * Décodage du payload sans dépendance ni vérification de signature.
 */
export function roleFromToken(accessToken?: string | null): string | null {
  if (!accessToken) return null;
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json);
    return typeof claims?.type_compte === 'string' ? claims.type_compte : null;
  } catch {
    return null;
  }
}

/**
 * Mappe un user Supabase Auth + le claim de rôle vers la forme attendue par l'app.
 * type_compte = claim JWT (hook serveur) en priorité ; sinon ADMIN_EMAILS reste
 * un BOOTSTRAP racine codé en dur (anti-lockout : l'admin racine marche même si
 * la table team_member / le hook ne sont pas encore en place).
 */
export function mapUser(
  u: SupabaseAuthUser | null | undefined,
  typeCompteClaim?: string | null,
): AppUser | null {
  if (!u || !u.email) return null;
  const email = u.email;
  const meta = u.user_metadata || {};
  const claim = (typeCompteClaim === 'directeur' || typeCompteClaim === 'agent') ? typeCompteClaim : null;
  const type_compte: AppUser['type_compte'] =
    claim ?? (ADMIN_EMAILS.includes(email) ? 'directeur' : undefined);
  const isAdmin = type_compte === 'directeur';
  return {
    id: u.id,
    email,
    full_name: meta.full_name || meta.name || email,
    role: isAdmin ? 'admin' : 'user',
    type_compte,
  };
}

// Identité courante depuis la session Supabase (locale, pas de réseau).
const meAsync = async () => {
  const { data } = await supabase.auth.getSession();
  return mapUser(data.session?.user, roleFromToken(data.session?.access_token));
};

export const appClient = {
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
    // Équipe = table `team_member` (admins/conseillers, pilotée depuis l'admin).
    // ADMIN_EMAILS = bootstrap racine garanti présent même si la table est vide.
    User: {
      list: async () => {
        let rows: any[] = [];
        try { rows = (await supabaseEntities.TeamMember.list()) as any[] || []; } catch { rows = []; }
        const fromTable = rows
          .filter((r) => r && r.actif !== false)
          .map((r) => ({
            email: r.email,
            full_name: r.nom || r.email,
            role: r.type_compte === 'directeur' ? 'admin' : 'user',
            type_compte: r.type_compte,
          }));
        const present = new Set(fromTable.map((u) => u.email));
        const bootstrap = ADMIN_EMAILS
          .filter((e) => !present.has(e))
          .map((e) => ({ email: e, full_name: 'Administrateur', role: 'admin', type_compte: 'directeur' }));
        return [...fromTable, ...bootstrap];
      },
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
