/**
 * [P1b gameplan] Attribution d'acquisition — capture UTM first-touch.
 *
 * But : savoir quel CANAL amène les comptes et les dossiers (CPL/CAC par canal
 * au tableau KPI). Sans ça, la dépense pub ne produit aucun apprentissage.
 *
 * Fonctionnement (first-touch : on garde la PREMIÈRE origine connue) :
 *  1. Au chargement de l'app : `captureAttribution()` lit `utm_source/medium/
 *     campaign` (+ term/content), le referrer EXTERNE et la page d'entrée →
 *     localStorage (si rien n'y est déjà).
 *  2. À la connexion/inscription : `syncAttributionCompte()` écrit UNE fois la
 *     ligne `compte_attribution` (PK user_id, insert-only → first-touch aussi
 *     côté serveur). Marche pour email ET OAuth Google.
 *  3. À la soumission d'un dossier : `getAttribution()` est recopié sur le
 *     `lead_dossier` (colonnes utm_*, cf. supabase_attribution_utm.sql).
 *
 * Vie privée : données d'origine de visite (pas de contenu financier), liées au
 * compte pour la mesure marketing interne — mention à prévoir dans la politique
 * de confidentialité (note au journal pour Yuri).
 */
import { supabase } from "@/api/supabaseClient";

const KEY = "mpf-attribution";
const KEY_SYNCED = "mpf-attribution-synced";

export interface Attribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
  page_entree: string;
  capte_le: string;
}

/** Lit l'attribution mémorisée (ou null). */
export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/**
 * À appeler UNE fois au chargement de l'app. First-touch : ne remplace jamais
 * une attribution déjà mémorisée. N'enregistre rien si la visite est directe
 * (aucun utm ni referrer externe) — pas de bruit.
 */
export function captureAttribution(): void {
  try {
    if (localStorage.getItem(KEY)) return; // first-touch déjà capté

    const q = new URLSearchParams(window.location.search);
    const utm_source = (q.get("utm_source") || "").slice(0, 120);
    const utm_medium = (q.get("utm_medium") || "").slice(0, 120);
    const utm_campaign = (q.get("utm_campaign") || "").slice(0, 120);
    const utm_term = (q.get("utm_term") || "").slice(0, 120);
    const utm_content = (q.get("utm_content") || "").slice(0, 120);

    // Referrer : seulement s'il est EXTERNE (une navigation interne n'est pas une origine).
    let referrer = "";
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host !== window.location.host) referrer = (ref.origin + ref.pathname).slice(0, 300);
    } catch { /* referrer illisible → ignorer */ }

    if (!utm_source && !utm_medium && !utm_campaign && !referrer) return; // visite directe

    const attr: Attribution = {
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      referrer,
      page_entree: window.location.pathname.slice(0, 200),
      capte_le: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(attr));
  } catch { /* localStorage indisponible → tant pis, pas bloquant */ }
}

/**
 * À appeler quand l'utilisateur est authentifié. Écrit la ligne
 * `compte_attribution` UNE seule fois (insert-only, `ignoreDuplicates` → le
 * first-touch serveur n'est jamais écrasé). Best-effort : aucune erreur ne
 * doit perturber l'app (table absente tant que le SQL n'est pas exécuté).
 */
export async function syncAttributionCompte(): Promise<void> {
  try {
    if (localStorage.getItem(KEY_SYNCED)) return;
    const attr = getAttribution();
    if (!attr) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;

    const { error } = await supabase.from("compte_attribution").upsert(
      {
        user_id: uid,
        utm_source: attr.utm_source, utm_medium: attr.utm_medium, utm_campaign: attr.utm_campaign,
        utm_term: attr.utm_term, utm_content: attr.utm_content,
        referrer: attr.referrer, page_entree: attr.page_entree,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    if (!error) localStorage.setItem(KEY_SYNCED, "1");
    else console.error("[attribution] sync compte:", error.message);
  } catch (e) {
    console.error("[attribution] sync compte:", e);
  }
}
