/**
 * [P4 gameplan] Parrainage — capture du lien référent + rattachement du filleul.
 *
 * Lien : monplanfin.ca/?ref=<code>. Récompense (côté serveur, cron —
 * supabase_parrainage.sql) : accès Studio temporaire au barème 1 filleul
 * validé = 1 mois, 3 = 12 mois, plafond 24. « Validé » = courriel vérifié +
 * 1re étape ABF commencée.
 *
 * LCAP : la plateforme n'envoie AUCUN courriel aux invités — l'utilisateur
 * partage son lien lui-même (copier/coller). First-touch : le premier code vu
 * est conservé (cohérent avec l'attribution UTM).
 */
import { supabase } from "@/api/supabaseClient";

const KEY = "mpf-ref";
const KEY_SYNCED = "mpf-ref-synced";

/** À appeler au chargement de l'app : mémorise ?ref=<code> (first-touch). */
export function captureParrainage(): void {
  try {
    if (localStorage.getItem(KEY)) return;
    const ref = (new URLSearchParams(window.location.search).get("ref") || "").trim().toUpperCase();
    if (!/^[A-Z2-9]{4,16}$/.test(ref)) return; // format de code plausible seulement
    localStorage.setItem(KEY, ref);
  } catch { /* noop */ }
}

/**
 * À appeler quand l'utilisateur est authentifié : enregistre UNE fois le lien
 * filleul→code (insert-only, RLS). La validation (courriel + ABF) et la
 * récompense sont 100 % côté serveur. Best-effort : jamais bloquant.
 */
export async function syncParrainage(): Promise<void> {
  try {
    if (localStorage.getItem(KEY_SYNCED)) return;
    const code = localStorage.getItem(KEY);
    if (!code) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    const { error } = await supabase.from("parrainage_filleul").upsert(
      { user_id: uid, code },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    if (!error) localStorage.setItem(KEY_SYNCED, "1");
    else console.error("[parrainage] sync filleul:", error.message);
  } catch (e) { console.error("[parrainage] sync filleul:", e); }
}

export interface MonParrainage {
  code: string;
  filleuls_valides: number;
  filleuls_en_attente: number;
  mois_attribues: number;
}

/** Code + compteurs du parrain (crée le code au 1er appel). Null si indispo. */
export async function getMonParrainage(): Promise<MonParrainage | null> {
  try {
    const { data, error } = await supabase.rpc("get_mon_parrainage");
    if (error) { console.error("[parrainage] rpc:", error.message); return null; }
    return data as MonParrainage;
  } catch (e) { console.error("[parrainage] rpc:", e); return null; }
}
