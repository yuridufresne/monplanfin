/**
 * src/lib/assignation.js
 * Logique d'assignation des dossiers aux agents
 */

export const STATUTS_ASSIGNATION = {
  NON_ASSIGNÉ: "non_assigné",
  ASSIGNÉ: "assigné",
  EN_COURS: "en_cours",
  SUSPENDU: "suspendu",
  COMPLÉTÉ: "complété"
};

/**
 * Assigner un dossier à un agent
 * @param {Object} dossier - Le dossier à assigner
 * @param {Object} agent - L'agent destinataire
 * @param {Object} admin - L'admin qui effectue l'assignation
 * @returns {Object} Le dossier mis à jour
 */
export function assignerDossier(dossier, agent, admin) {
  if (!dossier || !agent || !admin) {
    throw new Error("Dossier, agent et admin sont requis");
  }

  return {
    ...dossier,
    agent_id: agent.id,
    agent_nom: agent.full_name,
    statut_assignation: STATUTS_ASSIGNATION.ASSIGNÉ,
    date_assignation: new Date().toISOString(),
    assigné_par: admin.id
  };
}

/**
 * Réassigner un dossier à un nouvel agent
 * @param {Object} dossier - Le dossier actuellement assigné
 * @param {Object} nouvelAgent - Le nouvel agent
 * @param {Object} admin - L'admin qui effectue la réassignation
 * @param {string} raison - Raison de la réassignation
 * @returns {Object} Le dossier réassigné
 */
export function reassignerDossier(dossier, nouvelAgent, admin, raison = "") {
  if (!dossier.agent_id) {
    throw new Error("Le dossier n'est pas assigné");
  }

  const ancienAgent = {
    id: dossier.agent_id,
    nom: dossier.agent_nom
  };

  return {
    ...dossier,
    agent_id: nouvelAgent.id,
    agent_nom: nouvelAgent.full_name,
    statut_assignation: STATUTS_ASSIGNATION.ASSIGNÉ,
    date_reassignation: new Date().toISOString(),
    ancien_agent: ancienAgent,
    raison_reassignation: raison,
    reassigné_par: admin.id
  };
}

/**
 * Retirer l'assignation d'un dossier
 * @param {Object} dossier - Le dossier assigné
 * @param {Object} admin - L'admin qui effectue le retrait
 * @returns {Object} Le dossier non assigné
 */
export function retirerAssignation(dossier, admin) {
  if (!dossier.agent_id) {
    throw new Error("Le dossier n'est pas assigné");
  }

  return {
    ...dossier,
    agent_id: null,
    agent_nom: null,
    statut_assignation: STATUTS_ASSIGNATION.NON_ASSIGNÉ,
    date_retrait: new Date().toISOString(),
    retiré_par: admin.id
  };
}

/**
 * Marquer un dossier comme étant en cours de traitement
 * @param {Object} dossier - Le dossier assigné
 * @param {Object} agent - L'agent qui commence le traitement
 * @returns {Object} Le dossier en cours
 */
export function marquerEnCours(dossier, agent) {
  if (dossier.agent_id !== agent.id) {
    throw new Error("Seul l'agent assigné peut marquer le dossier en cours");
  }

  return {
    ...dossier,
    statut_assignation: STATUTS_ASSIGNATION.EN_COURS,
    date_debut_traitement: new Date().toISOString()
  };
}

/**
 * Marquer un dossier comme complété
 * @param {Object} dossier - Le dossier en cours de traitement
 * @param {Object} agent - L'agent qui complète le dossier
 * @returns {Object} Le dossier complété
 */
export function marquerComplété(dossier, agent) {
  if (dossier.agent_id !== agent.id) {
    throw new Error("Seul l'agent assigné peut compléter le dossier");
  }

  return {
    ...dossier,
    statut_assignation: STATUTS_ASSIGNATION.COMPLÉTÉ,
    date_completion: new Date().toISOString()
  };
}

/**
 * Suspendre temporairement un dossier
 * @param {Object} dossier - Le dossier assigné
 * @param {string} raison - Raison de la suspension
 * @returns {Object} Le dossier suspendu
 */
export function suspendre(dossier, raison = "") {
  return {
    ...dossier,
    statut_assignation: STATUTS_ASSIGNATION.SUSPENDU,
    date_suspension: new Date().toISOString(),
    raison_suspension: raison
  };
}

/**
 * Reprendre un dossier suspendu
 * @param {Object} dossier - Le dossier suspendu
 * @returns {Object} Le dossier repris
 */
export function reprendre(dossier) {
  if (dossier.statut_assignation !== STATUTS_ASSIGNATION.SUSPENDU) {
    throw new Error("Seul un dossier suspendu peut être repris");
  }

  return {
    ...dossier,
    statut_assignation: STATUTS_ASSIGNATION.EN_COURS,
    date_reprise: new Date().toISOString()
  };
}

/**
 * Vérifier si un dossier est assigné à un agent spécifique
 * @param {Object} dossier - Le dossier
 * @param {string} agentId - L'ID de l'agent
 * @returns {boolean}
 */
export function estAssignéÀ(dossier, agentId) {
  return dossier.agent_id === agentId;
}

/**
 * Vérifier si un dossier est disponible pour assignation
 * @param {Object} dossier - Le dossier
 * @returns {boolean}
 */
export function estDisponible(dossier) {
  return dossier.statut_assignation === STATUTS_ASSIGNATION.NON_ASSIGNÉ;
}

/**
 * Vérifier si un dossier est actuellement traité
 * @param {Object} dossier - Le dossier
 * @returns {boolean}
 */
export function estEnCours(dossier) {
  return dossier.statut_assignation === STATUTS_ASSIGNATION.EN_COURS;
}
