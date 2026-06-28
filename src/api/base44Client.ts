import { supabaseEntities } from './supabaseEntities';

const noop = () => {};

// Bêta mono-utilisateur : un seul user, identique à AuthContext. Les entités
// Supabase sont taguées created_by="user@monplanfin.ca" — me() DOIT retourner
// ce même courriel, sinon tout le filtrage created_by === moi.email vide les pages.
const BETA_USER = { email: 'user@monplanfin.ca', full_name: 'Utilisateur', role: 'user' };
const meAsync = async () => BETA_USER;

export const base44 = {
  auth: {
    me: meAsync,
    logout: noop,
    redirectToLogin: noop,
    isAuthenticated: async () => true,
  },
  entities: {
    User: { list: async () => [BETA_USER], me: meAsync },
    ...supabaseEntities,
  },
  functions: {
    // Anciennes fonctions backend Base44 (canadaPostAddress, getStockPrice) absentes
    // après migration. On renvoie { data: {} } — et non null — pour que les appelants
    // (res.data.Items / res.data?.results / res.data?.price) dégradent sans planter.
    invoke: async () => ({ data: {} }),
  },
};
