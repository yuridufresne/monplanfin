import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { supabaseEntities } from './supabaseEntities';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const realBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

export const base44 = {
  ...realBase44,
  entities: {
    ...realBase44.entities,
    ...supabaseEntities,
  },
};
