import { supabase } from './supabaseClient';
import * as Sentry from '@sentry/react';

const DEV = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? false;

// NE PAS avaler les erreurs Supabase en silence : une colonne/table absente
// (ex. schéma migré incomplet) doit rester traçable, sinon un insert/update
// échoue sans trace (c'est ce qui a masqué l'assignation/le consentement cassés).
//
// - En DEV : console.error (feedback immédiat pendant le dev).
// - En PROD : capture Sentry (pas de bruit dans la console utilisateur).
// - En PROD sans Sentry configuré : on RETOMBE sur la console — jamais avaler l'erreur.
function logErr(op: string, table: string, error: unknown) {
  if (!error) return;
  const msg = (error as { message?: string })?.message || error;
  if (DEV) {
    console.error(`[supabase] ${op} ${table}:`, msg);
    return;
  }
  if (Sentry.getClient?.()) {
    Sentry.captureException(
      error instanceof Error ? error : new Error(`[supabase] ${op} ${table}: ${String(msg)}`),
    );
  } else {
    console.error(`[supabase] ${op} ${table}:`, msg);
  }
}

function makeEntity(table: string) {
  return {
    list: async () => {
      const { data, error } = await supabase.from(table).select('*');
      logErr('list', table, error);
      return data || [];
    },
    create: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from(table).insert(payload).select();
      logErr('create', table, error);
      return data?.[0];
    },
    update: async (id: string, payload: Record<string, unknown>) => {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select();
      logErr('update', table, error);
      return data?.[0];
    },
    delete: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      logErr('delete', table, error);
    },
    filter: async (q: Record<string, unknown>) => {
      let query = supabase.from(table).select('*');
      Object.entries(q).forEach(([k, v]) => { query = query.eq(k, v); });
      const { data, error } = await query;
      logErr('filter', table, error);
      return data || [];
    },
    get: async (id: string) => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      logErr('get', table, error);
      return data;
    },
    deleteMany: async () => ({}),
    bulkCreate: async (rows: Record<string, unknown>[]) => {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      const { data, error } = await supabase.from(table).insert(rows).select();
      logErr('bulkCreate', table, error);
      return data || [];
    },
    restore: async () => null,
  };
}

export const supabaseEntities = {
  LeadDossier: makeEntity('lead_dossier'),
  Debt: makeEntity('debt'),
  BudgetEntry: makeEntity('budget_entry'),
  Investment: makeEntity('investment'),
  FinancialProfile: makeEntity('financial_profile'),
  FinancialGoal: makeEntity('financial_goal'),
  UserConsent: makeEntity('user_consent'),
  BetaFeedback: makeEntity('beta_feedback'),
  EducationProgress: makeEntity('education_progress'),
};
