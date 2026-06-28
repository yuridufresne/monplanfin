import { supabaseEntities } from './supabaseEntities';

const noop = () => {};

// Bêta mono-utilisateur : identité « client » par défaut. Les entités Supabase
// sont taguées created_by="user@monplanfin.ca" — me() DOIT retourner ce courriel
// sinon tout le filtrage created_by === moi.email vide les pages.
const CLIENT_USER = { email: 'user@monplanfin.ca', full_name: 'Utilisateur', role: 'user' };

// Allowlist admin. yuridufresne@gmail.com est le seul admin pour l'instant ;
// ajouter ici la secrétaire (assignation de dossiers) le moment venu.
export const ADMIN_EMAILS = ['yuridufresne@gmail.com'];
const ADMIN_FLAG = 'mpf-admin'; // localStorage : courriel admin déverrouillé

/** Identité de session : admin si un courriel valide est déverrouillé, sinon client. */
export function getSessionUser() {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(ADMIN_FLAG) : null;
    if (saved && ADMIN_EMAILS.includes(saved)) {
      return { email: saved, full_name: 'Administrateur', role: 'admin', type_compte: 'directeur' };
    }
  } catch { /* localStorage indisponible */ }
  return CLIENT_USER;
}

/** Déverrouille le mode admin si le courriel est dans l'allowlist. */
export function unlockAdmin(email) {
  if (ADMIN_EMAILS.includes(email)) {
    try { localStorage.setItem(ADMIN_FLAG, email); } catch { /* noop */ }
    return true;
  }
  return false;
}

/** Repasse en mode client. */
export function lockAdmin() {
  try { localStorage.removeItem(ADMIN_FLAG); } catch { /* noop */ }
}

const meAsync = async () => getSessionUser();

export const base44 = {
  auth: {
    me: meAsync,
    logout: () => lockAdmin(),
    redirectToLogin: noop,
    isAuthenticated: async () => true,
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
