/**
 * src/lib/assignation.js
 * Logique d'assignation des dossiers aux agents.
 */
import { appClient } from "@/api/usersClient";

// Récupère la liste des agents (type_compte = "agent" ou "directeur")
export async function chargerAgents() {
  const users = await appClient.entities.User.list();
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
      const rows = await appClient.entities[nom].filter({ created_by: clientCourriel });
      for (const r of rows) {
        if ((r.agent_courriel || "") !== agentCourriel) {
          await appClient.entities[nom].update(r.id, { agent_courriel: agentCourriel });
        }
      }
    } catch (e) {
      console.error("stamperAccesAgent", nom, e);
    }
  }
}

// Assigne un dossier à un agent (et ouvre l’accès RLS aux données du client)
export async function assignerDossier(dossierId, agent, assigneParCourriel) {
  let existant = null;
  try {
    const lus = await appClient.entities.LeadDossier.filter({ id: dossierId });
    existant = lus && lus[0] ? lus[0] : null;
  } catch (e) { console.error("assignerDossier/lecture", e); }
  const ancienAgent = (existant && existant.agent_assigne_courriel) || "";
  const estTransfert = !!ancienAgent && ancienAgent !== agent.courriel;
  const evenement = {
    type: estTransfert ? "transfert" : "assignation",
    de: ancienAgent,
    a: agent.courriel,
    date: new Date().toISOString(),
    par: assigneParCourriel,
  };
  const res = await appClient.entities.LeadDossier.update(dossierId, {
    agent_assigne_courriel: agent.courriel,
    agent_assigne_nom: agent.nom,
    assigne_par_courriel: assigneParCourriel,
    date_assignation: new Date().toISOString(),
    statut: estTransfert ? ((existant && existant.statut) || "vu") : "vu",
    transfert_en_attente: estTransfert,
    historique: [...((existant && existant.historique) || []), evenement],
  });
  try {
    const client = existant && existant.client_courriel;
    if (client) await stamperAccesAgent(client, agent.courriel);
  } catch (e) {
    console.error("assignerDossier/stamping", e);
  }
  return res;
}

// Retire l’assignation (referme l’accès RLS de l’agent)
export async function desassignerDossier(dossierId) {
  try {
    const dossiers = await appClient.entities.LeadDossier.filter({ id: dossierId });
    const client = dossiers && dossiers[0] && dossiers[0].client_courriel;
    if (client) await stamperAccesAgent(client, "");
  } catch (e) {
    console.error("desassignerDossier/stamping", e);
  }
  return appClient.entities.LeadDossier.update(dossierId, {
    agent_assigne_courriel: "",
    agent_assigne_nom: "",
    date_assignation: "",
  });
}