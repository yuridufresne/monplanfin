/**
 * [P1 gameplan] Événements marketing GÉNÉRIQUES pour le retargeting.
 *
 * 3 jalons : `abf_started` · `abf_completed` · `dossier_submitted`.
 * → audiences Meta « started sans submitted » (campagne « Terminez votre
 * portrait — 5 minutes »).
 *
 * Garde-fous :
 *  - AUCUNE donnée financière/personnelle dans les événements (Loi 25) — le nom
 *    du jalon, rien d'autre.
 *  - Respect du consentement : `fbq`/`gtag` n'existent qu'après consentement
 *    marketing (cf. consent.ts) ET on revérifie getConsent() ici.
 *  - Émission au niveau routes/pages génériques — JAMAIS dans
 *    `src/components/abf/**` (territoire /analyse figé).
 */
import { getConsent } from "@/lib/consent";

export type EvenementMarketing = "abf_started" | "abf_completed" | "dossier_submitted";

// Les 11 sections canoniques de l'ABF (jalon « complété » = les 11 présentes).
// Exportée : réutilisée par le portrait NIF partiel (P3) pour la progression.
export const SECTIONS_ABF = ["profil_personnel", "revenu", "allocations", "epargne", "dettes",
  "immobilier", "assurance", "etudes", "budget", "objectifs", "fonds_urgence"];

/** Émet un jalon vers Meta Pixel + GA — seulement si consenti et chargés. */
export function trackEvent(nom: EvenementMarketing): void {
  try {
    if (!getConsent()?.marketing) return;
    const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
    if (typeof w.fbq === "function") w.fbq("trackCustom", nom);
    if (typeof w.gtag === "function") w.gtag("event", nom);
  } catch { /* jamais bloquant */ }
}

/** Comme trackEvent, mais UNE seule fois par navigateur (audiences propres). */
export function trackOnce(nom: EvenementMarketing): void {
  try {
    const k = `mpf-evt-${nom}`;
    if (localStorage.getItem(k)) return;
    // Ne marque « envoyé » que si l'événement est réellement émissible (consenti) :
    // sinon un refus précoce brûlerait le jalon pour toujours.
    if (!getConsent()?.marketing) return;
    trackEvent(nom);
    localStorage.setItem(k, "1");
  } catch { /* noop */ }
}

/** Vrai si le profil ABF est complet (11/11 sections présentes). */
export function abfComplet(profiles: Array<{ section?: string }> | null | undefined): boolean {
  if (!Array.isArray(profiles)) return false;
  const present = new Set(profiles.map(p => p?.section).filter(Boolean));
  return SECTIONS_ABF.every(s => present.has(s));
}
