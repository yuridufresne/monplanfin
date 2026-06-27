import { supabaseEntities } from './supabaseEntities';

const noop = () => {};
const noopAsync = async () => null;
const noopList = async () => [];

export const base44 = {
  auth: {
    me: noopAsync,
    logout: noop,
    redirectToLogin: noop,
    isAuthenticated: async () => true,
  },
  entities: {
    User: { list: noopList, me: noopAsync },
    ...supabaseEntities,
  },
  functions: {
    invoke: noopAsync,
  },
};
