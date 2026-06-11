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

// Entités financières liées à un client (stamping pour l’accès RLS de l’agent)
const ENTITES_CLIENT = ["FinancialProfile", "BudgetEntry", "Debt", "FinancialGoal", "Investment"];

// Pose (ou retire si agentCourriel === "") l’accès agent sur tous les enregistrements du client
export async function stamperAccesAgent(clientCourriel, agentCourriel) {
  for (const nom of ENTITES_CLIENT) {
    try {
      const rows = await base44.entities[nom].filter({ created_by: clientCourriel });
      for (const r of rows) {
        if ((r.agent_courriel || "") !== agentCourriel) {
          await base44.entities[nom].update(r.id, { agent_courriel: agentCourriel });
        }
      }
    } catch (e) {
      console.error("stamperAccesAgent", nom, e);
    }
  }
}

// Assigne un dossier à un agent (et ouvre l’accès RLS aux données du client)
export async function assignerDossier(dossierId, agent, assigneParCourriel) {
  const res = await base44.entities.LeadDossier.update(dossierId, {
    agent_assigne_courriel: agent.courriel,
    agent_assigne_nom: agent.nom,
    assigne_par_courriel: assigneParCourriel,
    date_assignation: new Date().toISOString(),
    statut: "vu", // un dossier assigné passe au moins à "vu"
  });
  try {
    const dossiers = await base44.entities.LeadDossier.filter({ id: dossierId });
    const client = dossiers && dossiers[0] && dossiers[0].client_courriel;
    if (client) await stamperAccesAgent(client, agent.courriel);
  } catch (e) {
    console.error("assignerDossier/stamping", e);
  }
  return res;
}

// Retire l’assignation (referme l’accès RLS de l’agent)
export async function desassignerDossier(dossierId) {
  try {
    const dossiers = await base44.entities.LeadDossier.filter({ id: dossierId });
    const client = dossiers && dossiers[0] && dossiers[0].client_courriel;
    if (client) await stamperAccesAgent(client, "");
  } catch (e) {
    console.error("desassignerDossier/stamping", e);
  }
  return base44.entities.LeadDossier.update(dossierId, {
    agent_assigne_courriel: "",
    agent_assigne_nom: "",
    date_assignation: "",
  });
}