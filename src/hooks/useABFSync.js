/**
 * useABFSync
 * Synchronise les données saisies dans l'ABF (FinancialProfile)
 * vers les entités opérationnelles : Debt, BudgetEntry, FinancialGoal.
 * Appelé une fois au chargement du Dashboard.
 *
 * syncBudgetRevenuToABF : sens inverse — met à jour l'ABF quand les revenus
 * sont modifiés dans la grille budgétaire.
 */
import { base44 } from "@/api/base44Client";

export async function syncABFToEntities() {
  const profiles = await base44.entities.FinancialProfile.list();
  const bySection = {};
  profiles.forEach(p => { bySection[p.section] = p.data || {}; });

  // ── 1. REVENUS : les revenus sont gérés uniquement dans l'ABF, pas dans BudgetEntry ──

  // ── 1b. IMPÔTS (ABF revenu → BudgetEntry dépense, non modifiable) ────────
  const revenuData = bySection["revenu"];
  if (revenuData) {
    // Gérer la structure imbriquée potentielle
    const revData = revenuData.data || revenuData;
    const emplois = revData.emplois || [];
    let totalImpotMensuel = 0;
    for (const e of emplois) {
      const saisi = parseFloat(e.impot_saisi || e.impot_mensuel) || 0;
      const freq = e.impot_freq || "mensuel";
      totalImpotMensuel += freq === "annuel" ? saisi / 12 : saisi;
    }
    if (totalImpotMensuel > 0) {
      const label = "Impôts (retenues à la source)";
      const existing = await base44.entities.BudgetEntry.filter({ label });
      if (existing.length === 0) {
        await base44.entities.BudgetEntry.create({
          category: "divers", label, amount: totalImpotMensuel,
          type: "depense", frequency: "mensuel", is_fixed: true, source: "abf",
        });
      } else {
        await base44.entities.BudgetEntry.update(existing[0].id, { amount: totalImpotMensuel, source: "abf" });
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

/**
 * syncBudgetRevenuToABF
 * Appelé après la sauvegarde de la grille budgétaire.
 * Met à jour la section "revenu" de l'ABF avec les revenus saisis dans le budget.
 * On fusionne par label pour éviter les doublons.
 *
 * @param {Array} revenusEntries - Tableau de BudgetEntry de type "revenu"
 */
export async function syncBudgetRevenuToABF(revenusEntries) {
  if (!revenusEntries || revenusEntries.length === 0) return;

  const profiles = await base44.entities.FinancialProfile.list();
  const revenuProfile = profiles.find(p => p.section === "revenu");

  const currentData = revenuProfile?.data || {};
  const emploisActuels = currentData.emplois || [];
  const sidesActuels = currentData.sidehustles || [];

  // Labels ABF connus
  const labelsEmplois = emploisActuels.map(e => e.employeur || e.poste || "Revenu emploi");
  const labelsSides = sidesActuels.map(s => s.nom || `Side hustle (${s.type})`);
  const labelsABF = new Set([...labelsEmplois, ...labelsSides]);

  // Revenus du budget qui ne sont pas dans l'ABF → on les ajoute comme emploi
  const nouveaux = revenusEntries.filter(e => !labelsABF.has(e.label));

  if (nouveaux.length === 0) {
    // Mettre à jour les montants existants dans l'ABF
    const emploisMAJ = emploisActuels.map(e => {
      const label = e.employeur || e.poste || "Revenu emploi";
      const budgetEntry = revenusEntries.find(r => r.label === label);
      if (budgetEntry) {
        return { ...e, revenu_brut: String(Math.round(budgetEntry.amount * 12)) };
      }
      return e;
    });
    const sidesMAJ = sidesActuels.map(s => {
      const label = s.nom || `Side hustle (${s.type})`;
      const budgetEntry = revenusEntries.find(r => r.label === label);
      if (budgetEntry) {
        return { ...s, revenu_mensuel_moyen: String(Math.round(budgetEntry.amount)) };
      }
      return s;
    });

    const newData = { ...currentData, emplois: emploisMAJ, sidehustles: sidesMAJ };
    if (revenuProfile) {
      await base44.entities.FinancialProfile.update(revenuProfile.id, { data: newData });
    } else {
      await base44.entities.FinancialProfile.create({ section: "revenu", data: newData, completed: true });
    }
    return;
  }

  // Il y a des nouveaux revenus — les ajouter à l'ABF comme emplois
  const emploisAjoutes = nouveaux.map(e => ({
    employeur: e.label,
    poste: "",
    revenu_brut: String(Math.round(e.amount * 12)),
    type_emploi: "temps_plein",
  }));

  // Et mettre à jour les existants
  const emploisMAJ = emploisActuels.map(e => {
    const label = e.employeur || e.poste || "Revenu emploi";
    const budgetEntry = revenusEntries.find(r => r.label === label);
    if (budgetEntry) {
      return { ...e, revenu_brut: String(Math.round(budgetEntry.amount * 12)) };
    }
    return e;
  });

  const newData = {
    ...currentData,
    emplois: [...emploisMAJ, ...emploisAjoutes],
    sidehustles: sidesActuels,
  };

  if (revenuProfile) {
    await base44.entities.FinancialProfile.update(revenuProfile.id, { data: newData });
  } else {
    await base44.entities.FinancialProfile.create({ section: "revenu", data: newData, completed: true });
  }
}