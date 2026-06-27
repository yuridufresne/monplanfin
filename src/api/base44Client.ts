import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { supabase } from './supabaseClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const realBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Wrapper: redirige LeadDossier vers Supabase
const supabaseLeadDossier = {
  list: async () => {
    const { data, error } = await supabase.from('lead_dossier').select('*');
    if (error) throw error;
    return data;
  },
  create: async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.from('lead_dossier').insert(payload).select();
    if (error) throw error;
    return data?.[0];
  },
  update: async (id: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.from('lead_dossier').update(payload).eq('id', id).select();
    if (error) throw error;
    return data?.[0];
  },
  filter: async (q: Record<string, unknown>) => {
    let query = supabase.from('lead_dossier').select('*');
    Object.entries(q).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  deleteMany: async () => ({}) as unknown,
  bulkCreate: async () => [],
  get: async () => null,
  delete: async () => {},
  restore: async () => null,
};

export const base44 = {
  ...realBase44,
  entities: {
    ...realBase44.entities,
    LeadDossier: supabaseLeadDossier,
  },
};
