/**
 * src/lib/roles.js
 * Source unique de vérité pour les rôles métier de MonPlanFin.
 *
 * Distinction importante :
 *  - user.role        → rôle PLATEFORME Base44 ("admin" | "user") — ne pas confondre
 *  - user.type_compte → rôle MÉTIER ("client" | "agent" | "directeur")
 *
 * getRoleEffectif() combine les deux en un seul rôle applicatif :
 *  "admin"  → toi / la direction (accès total, dispatch des dossiers)
 *  "agent"  → conseiller qui traite les dossiers qui lui sont assignés
 *  "client" → utilisateur régulier (son ABF, son tableau de bord)
 */

export const ROLES = { ADMIN: "admin", AGENT: "agent", CLIENT: "client" };

export function getRoleEffectif(user) {
  if (!user) return ROLES.CLIENT;

  // L'admin plateforme Base44 OU le directeur métier → rôle admin applicatif
  if (user.role === "admin" || user.type_compte === "directeur") return ROLES.ADMIN;

  // Agent métier
  if (user.type_compte === "agent") return ROLES.AGENT;

  // Tout le reste → client
  return ROLES.CLIENT;
}

// Helpers pratiques
export const estAdmin  = (user) => getRoleEffectif(user) === ROLES.ADMIN;
export const estAgent  = (user) => getRoleEffectif(user) === ROLES.AGENT;
export const estClient = (user) => getRoleEffectif(user) === ROLES.CLIENT;

// Destination de redirection après connexion selon le rôle
export function routeAccueil(user) {
  const r = getRoleEffectif(user);
  if (r === ROLES.ADMIN) return "/admin/dossiers";
  if (r === ROLES.AGENT) return "/agent";
  return "/dashboard";
}

// Libellé de bienvenue (pour l'écran de login)
export function libelleBienvenue(user) {
  const r = getRoleEffectif(user);
  const prenom = (user?.full_name || "").split(" ")[0];
  if (r === ROLES.ADMIN) return `Connexion sécurisée${prenom ? `, ${prenom}` : ""} — Direction`;
  if (r === ROLES.AGENT) return `Bienvenue, Conseiller${prenom ? ` ${prenom}` : ""}`;
  return `Bienvenue dans votre espace${prenom ? `, ${prenom}` : ""}`;
}
