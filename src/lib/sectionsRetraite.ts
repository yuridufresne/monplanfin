/**
 * src/lib/sectionsRetraite.js
 * Résolveur de la section « retraite » éclatée par la refonte ABF 11 étapes.
 *
 * Avant : une seule section de stockage `retraite` portait les comptes d'épargne,
 * le fond de pension ET les revenus garantis / la cible (RRQ, PSV, âge, train de vie).
 * Après : Épargne (étape 4) → section `epargne` ; Objectifs (étape 10) → section
 * `objectifs`. Comme ~13 lecteurs (buildPayload, calcNIF, calcEpargne, calcValeurNette…)
 * lisent encore la forme historique `retraite`, ce résolveur la RECONSTRUIT à partir
 * des nouvelles sections, avec repli sur la legacy `retraite`.
 *
 * SSOT : un seul point de fusion. Comportement STRICTEMENT identique tant que les
 * nouvelles sections n'existent pas (court-circuit no-op) → aucun profil cassé.
 */

function unwrap(d) {
  return (d && d.data && d.data.data) || (d && d.data) || d || {};
}

/** Construit le dictionnaire { section: donnéesDéballées } depuis un tableau de profils. */
export function dictSections(profiles: any[] = []): Record<string, any> {
  const dict: Record<string, any> = {};
  (profiles || []).forEach((p) => {
    const section = (p && p.section) || (p && p.data && p.data.section);
    if (section) dict[section] = unwrap(p.data || p);
  });
  return dict;
}

/** Fusionne legacy + épargne + objectifs en gardant la forme « retraite » historique. */
function fusionner(base, eps, obs) {
  const b = base || {}, e = eps || {}, o = obs || {};
  return {
    ...b,
    ...e,
    ...o, // Objectifs prime pour rrq_mode / age_* / revenu_retraite_* / cible
    comptes: e.comptes || b.comptes || {},
    fond_pension: { ...(b.fond_pension || {}), ...(e.fond_pension || {}), ...(o.fond_pension || {}) },
  };
}

/**
 * Reconstruit l'objet « retraite » (avec son `.conjoint`) attendu par les lecteurs.
 * @param {object} dict - dictionnaire de sections déjà déballées.
 */
export function resoudreRetraite(dict: Record<string, any> = {}): Record<string, any> {
  const legacy = dict.retraite || {};
  const ep = dict.epargne;
  const obj = dict.objectifs;
  const etu = dict.etudes; // REEE possédé par l'étape Études (anti double-comptage avec Épargne)
  if (!ep && !obj && !etu) return legacy; // repli pur : aucune nouvelle section → no-op

  const ret = fusionner(legacy, ep, obj);
  ret.conjoint = fusionner(legacy.conjoint, ep && ep.conjoint, obj && obj.conjoint);

  // Le REEE vient d'Études (une seule source pour la valeur nette).
  const reeeA = etu && etu.comptes && etu.comptes.reee;
  const reeeB = etu && etu.conjoint && etu.conjoint.comptes && etu.conjoint.comptes.reee;
  if (reeeA) ret.comptes = { ...(ret.comptes || {}), reee: reeeA };
  if (reeeB) ret.conjoint.comptes = { ...(ret.conjoint.comptes || {}), reee: reeeB };
  return ret;
}

/** Raccourci : résout la « retraite » directement depuis un tableau de profils. */
export function lireRetraite(profiles = []) {
  return resoudreRetraite(dictSections(profiles));
}
