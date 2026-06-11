/**
 * src/lib/assignation.js
 * Logique d'assignation des dossiers aux agents.
 */
import { base44 } from "@/api/base44Client";

// Récupère la liste des agents (type_compte = "agent" ou "directeur")
export async function chargerAgents() {
  const users = await base44.entities.User.list();
  return users
    .filter(u => u.type_compte === "agent" || u.type_compte === "directeur")
    .map(u => ({ courriel: u.email, nom: u.full_name || u.email, type: u.type_compte }));
}

// Assigne un dossier à un agent
export async function assignerDossier(dossierId, agent, assigneParCourriel) {
  return base44.entities.LeadDossier.update(dossierId, {
    agent_assigne_courriel: agent.courriel,
    agent_assigne_nom: agent.nom,
    assigne_par_courriel: assigneParCourriel,
    date_assignation: new Date().toISOString(),
    statut: "vu", // un dossier assigné passe au moins à "vu"
  });
}

// Retire l'assignation (remet le dossier dans le pool non-assigné)
export async function desassignerDossier(dossierId) {
  return base44.entities.LeadDossier.update(dossierId, {
    agent_assigne_courriel: "",
    agent_assigne_nom: "",
    date_assignation: "",
  });
}
