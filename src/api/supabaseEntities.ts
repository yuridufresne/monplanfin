import { supabase } from './supabaseClient';

// NE PAS avaler les erreurs Supabase en silence : une colonne/table absente
// (ex. schéma migré incomplet) doit être VISIBLE en console, sinon un insert/update
// échoue sans trace (c'est ce qui a masqué l'assignation/le consentement cassés).
function logErr(op: string, table: string, error: unknown) {
  if (error) console.error(`[supabase] ${op} ${table}:`, (error as { message?: string })?.message || error);
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
    bulkCreate: async () => [],
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
