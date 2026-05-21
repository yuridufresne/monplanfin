/**
 * useABFSync
 * Synchronise les données saisies dans l'ABF (FinancialProfile)
 * vers les entités opérationnelles : Debt, BudgetEntry, FinancialGoal.
 * Appelé une fois au chargement du Dashboard.
 */
import { base44 } from "@/api/base44Client";

export async function syncABFToEntities() {
  const profiles = await base44.entities.FinancialProfile.list();
  const bySection = {};
  profiles.forEach(p => { bySection[p.section] = p.data || {}; });

  // ── 1. REVENUS (ABF revenu → BudgetEntry) ─────────────────────────────────
  const revenuData = bySection["revenu"];
  if (revenuData) {
    const emplois = revenuData.emplois || [];
    const sides = revenuData.sidehustles || [];

    for (const e of emplois) {
      if (!e.employeur && !e.revenu_brut) continue;
      const montantMensuel = (parseFloat(e.revenu_brut) || 0) / 12;
      if (montantMensuel <= 0) continue;
      const label = e.employeur || e.poste || "Revenu emploi";
      // Check if already exists
      const existing = await base44.entities.BudgetEntry.filter({ label, type: "revenu" });
      if (existing.length === 0) {
        await base44.entities.BudgetEntry.create({
          category: "divers", label, amount: montantMensuel, type: "revenu", frequency: "mensuel", is_fixed: true,
        });
      }
    }

    for (const s of sides) {
      if (!s.revenu_mensuel_moyen) continue;
      const montant = parseFloat(s.revenu_mensuel_moyen) || 0;
      if (montant <= 0) continue;
      const label = s.nom || `Side hustle (${s.type})`;
      const existing = await base44.entities.BudgetEntry.filter({ label, type: "revenu" });
      if (existing.length === 0) {
        await base44.entities.BudgetEntry.create({
          category: "divers", label, amount: montant, type: "revenu", frequency: "mensuel", is_fixed: false,
        });
      }
    }
  }

  // ── 2. DETTES (ABF dettes → Debt) ─────────────────────────────────────────
  const dettesData = bySection["dettes"];
  if (dettesData) {
    const autresDettes = dettesData.dettes || [];
    const hypotheques = dettesData.hypotheques || [];

    for (const d of autresDettes) {
      if (!d.solde || parseFloat(d.solde) <= 0) continue;
      const name = d.type || "Dette";
      const existing = await base44.entities.Debt.filter({ name });
      if (existing.length === 0) {
        await base44.entities.Debt.create({
          name,
          type: "autre",
          balance: parseFloat(d.solde) || 0,
          interest_rate: parseFloat(d.taux) || 0,
          minimum_payment: parseFloat(d.paiement_min) || 0,
          monthly_payment: parseFloat(d.paiement_min) || 0,
        });
      }
    }

    for (const h of hypotheques) {
      if (!h.solde || parseFloat(h.solde) <= 0) continue;
      const name = h.adresse || "Hypothèque";
      const existing = await base44.entities.Debt.filter({ name });
      if (existing.length === 0) {
        await base44.entities.Debt.create({
          name,
          type: "hypotheque",
          balance: parseFloat(h.solde) || 0,
          interest_rate: parseFloat(h.taux) || 0,
          minimum_payment: parseFloat(h.paiement_mensuel) || 0,
          monthly_payment: parseFloat(h.paiement_mensuel) || 0,
          original_amount: parseFloat(h.prix_achat) || 0,
        });
      }
    }
  }

  // ── 3. OBJECTIFS (ABF objectifs → FinancialGoal) ──────────────────────────
  const objectifsData = bySection["objectifs"];
  if (objectifsData?.a_objectifs === "oui") {
    const objectifs = objectifsData.objectifs || [];
    for (const o of objectifs) {
      if (!o.nom || !o.montant) continue;
      const existing = await base44.entities.FinancialGoal.filter({ title: o.nom });
      if (existing.length === 0) {
        await base44.entities.FinancialGoal.create({
          title: o.nom,
          target_amount: parseFloat(o.montant) || 0,
          current_amount: 0,
          category: "autre",
          priority: "moyenne",
        });
      }
    }
  }

  // ── 4. FONDS D'URGENCE (ABF fonds_urgence → FinancialGoal) ────────────────
  const fondsData = bySection["fonds_urgence"];
  if (fondsData?.objectif_fonds) {
    const existing = await base44.entities.FinancialGoal.filter({ title: "Fonds d'urgence" });
    if (existing.length === 0) {
      await base44.entities.FinancialGoal.create({
        title: "Fonds d'urgence",
        target_amount: parseFloat(fondsData.objectif_fonds) || 0,
        current_amount: parseFloat(fondsData.montant_fonds) || 0,
        category: "fond_urgence",
        priority: "haute",
      });
    }
  }
}