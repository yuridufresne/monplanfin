import { supabase } from './supabaseClient';

function makeEntity(table: string) {
  return {
    list: async () => {
      const { data } = await supabase.from(table).select('*');
      return data || [];
    },
    create: async (payload: Record<string, unknown>) => {
      const { data } = await supabase.from(table).insert(payload).select();
      return data?.[0];
    },
    update: async (id: string, payload: Record<string, unknown>) => {
      const { data } = await supabase.from(table).update(payload).eq('id', id).select();
      return data?.[0];
    },
    delete: async (id: string) => {
      await supabase.from(table).delete().eq('id', id);
    },
    filter: async (q: Record<string, unknown>) => {
      let query = supabase.from(table).select('*');
      Object.entries(q).forEach(([k, v]) => { query = query.eq(k, v); });
      const { data } = await query;
      return data || [];
    },
    get: async (id: string) => {
      const { data } = await supabase.from(table).select('*').eq('id', id).single();
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
