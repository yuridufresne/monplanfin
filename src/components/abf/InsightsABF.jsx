import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { calcRevenuDisponible } from "@/lib/calcRevenuNet";

/**
 * InsightsABF — insights instantanés affichés à la complétion d'une section.
 * Clés alignées sur l'ABF MonPlanFin (a_assurance_vie/testament en "oui"/"non",
 * comptes cri_lira/ftq_csn/etc., hypothèques dans la section immobilier).
 */

const fmt = (v) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Math.round(v) || 0);

const COMPTE_KEYS = ["compte_non_enregistre", "celi", "celiapp", "reer", "reee", "cri_lira", "crypto", "ftq_csn"];

function tauxMarginalApprox(brut) {
  if (brut <= 0) return 0;
  if (brut <= 53000) return 27.5;
  if (brut <= 106000) return 37.1;
  if (brut <= 130000) return 41.1;
  if (brut <= 180000) return 45.7;
  if (brut <= 253000) return 47.5;
  return 53.3;
}

function tauxEffectifApprox(brut) {
  if (brut <= 0) return 0;
  if (brut <= 25000) return 0.12;
  if (brut <= 45000) return 0.19;
  if (brut <= 70000) return 0.25;
  if (brut <= 100000) return 0.30;
  if (brut <= 150000) return 0.345;
  return 0.40;
}

export function getInsightForSection(sectionId, S = {}) {
  const sum = (arr, f) => (arr || []).reduce((s, x) => s + (parseFloat(f(x)) || 0), 0);
  const profil = S.profil_personnel || {};
  const revenu = S.revenu || {};
  const enCouple = ["marie", "conjoint", "union_civile"].includes(profil.situation || "");

  const brutPersonne = (r) => {
    if (!r) return 0;
    const st = r.statut_principal || "travail";
    let t = sum(r.sidehustles, sh => sh.revenu_mensuel_moyen) * 12;
    if (st === "travail" || st === "etudes") t += sum(r.emplois, e => e.revenu_brut);
    if (st === "chomage") t += (parseFloat(r.prestations_ae_mensuel) || 0) * 12;
    if (st === "etudes") t += (parseFloat(r.bourses_annuel) || 0);
    if (st === "retraite") t += ((parseFloat(r.rrq_actuel_mensuel) || 0) + (parseFloat(r.psv_actuel_mensuel) || 0) + (parseFloat(r.pensions_actuel_mensuel) || 0)) * 12;
    return t;
  };
  const brutFoyer = brutPersonne(revenu) + (enCouple ? brutPersonne(revenu.conjoint) : 0);

  switch (sectionId) {
    case "profil_personnel": {
      const prenom = (profil.nom || "").split(" ")[0];
      return {
        icon: "🚀", color: "#C9A063",
        titre: prenom ? `C'est parti, ${prenom} !` : "C'est parti !",
        texte: enCouple
          ? "Analyse en mode foyer — votre portrait financier de couple se construit dans le panneau de droite à chaque réponse."
          : "Votre portrait financier se construit dans le panneau de droite à chaque réponse. Plus c'est précis, plus votre plan sera puissant.",
      };
    }

    case "revenu": {
      const st = revenu.statut_principal || "travail";
      if (st === "chomage") return {
        icon: "🧭", color: "#f59e0b",
        titre: "Période de transition — protégez vos acquis",
        texte: "Les prestations d'AE sont imposables avec peu de retenues à la source. Priorité : préserver le fonds d'urgence et éviter les retraits REER (imposables et droits perdus à vie).",
      };
      if (st === "retraite") return {
        icon: "🌅", color: "#C9A063",
        titre: "Optimisations possibles à la retraite",
        texte: "Fractionnement de revenu de pension avec le conjoint, ordre de décaissement optimal et gestion du seuil de récupération de la PSV : votre Studio de décaissement vous attend sur le tableau de bord.",
      };
      if (st === "foyer") return {
        icon: "💛", color: "#5BC4A0",
        titre: "Le REER de conjoint travaille pour vous",
        texte: "Quand un conjoint a peu de revenus, le REER de conjoint permet de fractionner l'impôt familial à la retraite — un levier puissant pour les foyers à revenu unique.",
      };
      const brutA = brutPersonne(revenu);
      const brutB = enCouple ? brutPersonne(revenu.conjoint) : 0;
      const brutMax = Math.max(brutA, brutB);
      if (brutMax <= 0) return null;
      const marginal = tauxMarginalApprox(brutMax);
      const retour = Math.round(1000 * marginal / 100);
      return {
        icon: "💰", color: "#C9A063",
        titre: `Votre taux marginal ≈ ${marginal.toFixed(1).replace(".", ",")} %`,
        texte: `Chaque tranche de 1 000 $ cotisée en REER vous redonne environ ${fmt(retour)} d'impôt. C'est l'un des leviers qu'on optimisera dans votre plan.`,
      };
    }

    case "allocations": {
      const enfants = (S.allocations || {}).enfants || [];
      if (!enfants.length) return null;
      return {
        icon: "👶", color: "#5BC4A0",
        titre: "Vos allocations sont 100 % non imposables",
        texte: "ACE fédérale + Allocation famille du Québec : un revenu net d'impôt. Rediriger une partie vers le REEE débloque 30 % de subventions supplémentaires.",
      };
    }

    case "retraite": {
      const r = S.retraite || {};
      const comptes = r.comptes || {};
      const comptesB = enCouple ? (r.conjoint?.comptes || {}) : {};
      const solde = COMPTE_KEYS.reduce((s, k) => s + sum(comptes[k], c => c.solde) + sum(comptesB[k], c => c.solde), 0)
        + (parseFloat(r.fond_pension?.solde) || 0) + (parseFloat(r.conjoint?.fond_pension?.solde) || 0);
      const cotM = COMPTE_KEYS.reduce((s, k) => s + sum(comptes[k], c => c.cotisation_mensuelle) + sum(comptesB[k], c => c.cotisation_mensuelle), 0)
        + (parseFloat(r.fond_pension?.cotisation_salariale) || 0) + (parseFloat(r.fond_pension?.cotisation_patronale) || 0);
      if (solde <= 0 && cotM <= 0) return null;
      const age = profil.dob ? Math.floor((Date.now() - new Date(profil.dob)) / (365.25 * 24 * 3600 * 1000)) : 35;
      const ageRetraite = parseInt(r.age_retraite) || 65;
      const annees = Math.max(1, ageRetraite - age);
      const taux = 0.05;
      const futur = solde * Math.pow(1 + taux, annees) + (cotM > 0 ? cotM * 12 * ((Math.pow(1 + taux, annees) - 1) / taux) : 0);
      return {
        icon: "📈", color: "#5BC4A0",
        titre: `À ce rythme : ≈ ${fmt(futur)} à ${ageRetraite} ans`,
        texte: `Projection à 5 %/an avec vos soldes actuels${cotM > 0 ? ` et ${fmt(cotM)}/mois de cotisations` : ""}. Votre score NIF complet vous attend sur le tableau de bord.`,
      };
    }

    case "dettes": {
      const d = S.dettes || {};
      const toutes = [...(d.dettes || []), ...(enCouple ? (d.conjoint?.dettes || []) : [])];
      const interetsAn = toutes.reduce((s, x) => s + (parseFloat(x.solde) || 0) * (parseFloat(x.taux) || 0) / 100, 0);
      if (interetsAn <= 0) return {
        icon: "🎉", color: "#5BC4A0",
        titre: "Aucune dette à intérêt élevé",
        texte: "Votre capacité d'épargne est intacte — c'est un avantage énorme pour la suite du plan.",
      };
      const pire = toutes.reduce((m, x) => (parseFloat(x.taux) || 0) > (parseFloat(m?.taux) || 0) ? x : m, toutes[0]);
      return {
        icon: "💳", color: "#f59e0b",
        titre: `Vos dettes coûtent ≈ ${fmt(interetsAn)}/an en intérêts`,
        texte: `Soit ${fmt(interetsAn / 12)}/mois. Rembourser la dette à ${pire?.taux || 0} % en priorité = un rendement garanti de ${pire?.taux || 0} %, sans risque. Aucun placement ne bat ça.`,
      };
    }

    case "immobilier": {
      const hypos = (S.immobilier || {}).hypotheques || [];
      if (hypos.length > 0) {
        const equite = hypos.reduce((s, h) => s + ((parseFloat(h.valeur_marchande) || parseFloat(h.prix_achat) || 0) - (parseFloat(h.solde) || 0)), 0);
        if (equite > 0) return {
          icon: "🏠", color: "#C9A063",
          titre: `Votre équité immobilière ≈ ${fmt(equite)}`,
          texte: "Un actif puissant : elle peut servir de levier (refinancement, marge hypothécaire) ou de mise de fonds pour un prochain achat.",
        };
      }
      return {
        icon: "🏠", color: "#C9A063",
        titre: "Pré-qualification en préparation",
        texte: "Votre capacité d'emprunt estimée (règles BSIF 2026) vous attend sur le tableau de bord, avec comparaison des mises de fonds 5/10/15/20 %.",
      };
    }

    case "assurance": {
      const a = S.assurance || {};
      if (a.a_assurance_vie !== "oui" && brutFoyer > 0) return {
        icon: "🛡️", color: "#f59e0b",
        titre: `Couverture indicative : ≈ ${fmt(brutFoyer * 10)}`,
        texte: "La règle de base est ~10× le revenu brut familial. Vos 3 options personnalisées (temporaire vs permanente) seront sur votre tableau de bord.",
      };
      if (a.testament !== "oui") return {
        icon: "🪶", color: "#C9A063",
        titre: "Pensez au testament",
        texte: "Plus de la moitié des Québécois n'en ont pas à jour. Sans testament, c'est la loi qui décide de votre succession — pas vous. On y reviendra dans votre plan.",
      };
      return {
        icon: "✓", color: "#5BC4A0",
        titre: "Protection en place",
        texte: "Assurance et testament : bonne base. On validera que les montants correspondent encore à votre situation actuelle.",
      };
    }

    case "etudes": {
      const enfants = (S.etudes || {}).enfants || [];
      if (!enfants.length) return null;
      const cotTotale = enfants.reduce((s, e) => s + (parseFloat(e.reee_cotisation_mensuelle) || 0), 0);
      const cible = enfants.length * 208;
      if (cotTotale < cible) return {
        icon: "🎓", color: "#A87DD3",
        titre: `${fmt(750 * enfants.length)}/an de subventions disponibles`,
        texte: `À 208 $/mois par enfant (2 500 $/an), le REEE débloque SCEE 20 % + IQEE 10 % — un rendement immédiat de 30 % garanti par les gouvernements.`,
      };
      return {
        icon: "🎓", color: "#5BC4A0",
        titre: "Subventions REEE maximisées",
        texte: "Vous captez le plein 30 % de SCEE + IQEE chaque année. Excellent réflexe — peu de familles y arrivent.",
      };
    }

    case "objectifs": {
      const o = S.objectifs || {};
      if (o.a_objectifs !== "oui") return null;
      return {
        icon: "🎯", color: "#C9A063",
        titre: "Vos objectifs sont maintenant écrits",
        texte: "Un objectif écrit, chiffré et daté a beaucoup plus de chances de se réaliser. Votre plan leur donnera un échéancier concret.",
      };
    }

    case "fonds_urgence": {
      const montant = parseFloat((S.fonds_urgence || {}).montant_fonds) || 0;
      if (brutFoyer <= 0) return null;
      const netM = calcRevenuDisponible([{ section: "revenu", data: S.revenu || {} }, { section: "retraite", data: S.retraite || {} }]).revenuNetMensuel;
      const mois = netM > 0 ? montant / (netM * 0.8) : 0;
      const ok = mois >= 3;
      return {
        icon: ok ? "🛡️" : "⚠️", color: ok ? "#5BC4A0" : "#f59e0b",
        titre: `Votre coussin couvre ≈ ${mois.toFixed(1).replace(".", ",")} mois`,
        texte: ok
          ? "Vous êtes dans la cible de 3 à 6 mois — votre filet de sécurité est solide."
          : "La cible est de 3 à 6 mois de train de vie. Pas de panique : on bâtira ça progressivement dans votre plan.",
      };
    }

    default:
      return null;
  }
}

export function InsightCard({ insight }) {
  if (!insight) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={insight.titre}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: "flex", gap: 14, alignItems: "flex-start",
          padding: "16px 18px", borderRadius: 14, marginBottom: 16,
          background: `linear-gradient(135deg, ${insight.color}14, rgba(255,255,255,0.02))`,
          border: `1px solid ${insight.color}40`,
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{insight.icon}</span>
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: insight.color, marginBottom: 4, letterSpacing: "-0.01em" }}>
            {insight.titre}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
            {insight.texte}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}