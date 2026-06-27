export interface LeadDossier {
  client_nom: string;
  client_courriel: string;
  client_telephone: string;
  besoins_principaux: string[];
  priorite_urgence: string;
  statut: string;
  agent_assigne_courriel: string;
  agent_assigne_nom: string;
  notes_client: string;
  snapshot_profil: Record<string, unknown>;
}

export interface User {
  email: string;
  full_name: string;
  role: string;
}
