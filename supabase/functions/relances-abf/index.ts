// ============================================================================
// [P2 gameplan] Edge Function `relances-abf` — séquence de relance 24 h/72 h/7 j
// ----------------------------------------------------------------------------
// Déclenchée par le CRON (1×/heure — voir supabase_p2_courriels.sql). Cible :
// comptes avec un ABF COMMENCÉ mais INCOMPLET (<11 sections) et SANS dossier
// soumis, non désabonnés. 3 relances max, jamais deux fois la même
// (idempotence via `email_log`) :
//   J+1  « votre progression est sauvegardée »
//   J+3  « aperçu de ce qui vous attend »
//   J+7  dernière relance
// LCAP : lien de désabonnement 1 clic dans CHAQUE relance (HMAC dérivé du
// service role — vérifié par la fonction `desabonnement`), identification de
// l'expéditeur, boîte réelle en réponse. Français d'abord (Loi 101).
//
// Sécurité : requêtes service-role internes ; l'appel externe doit porter le
// header `x-cron-secret` = secret CRON_SECRET (Dashboard → Secrets).
// Zéro import : self-contained (collable dans l'éditeur Dashboard).
// ============================================================================

const EXPEDITEUR = "MonPlanFin <bonjour@monplanfin.ca>";
const SITE = "https://monplanfin.ca";
const SECTIONS_CANON = ["profil_personnel", "revenu", "allocations", "epargne", "dettes",
  "immobilier", "assurance", "etudes", "budget", "objectifs", "fonds_urgence"];
const NB_CANON = 11;

interface Etape { type: string; heures: number; sujet: string; titre: string; corps: (lienAnalyse: string) => string }
const ETAPES: Etape[] = [
  {
    type: "relance_24h", heures: 24,
    sujet: "Votre progression est sauvegardée — MonPlanFin",
    titre: "Votre portrait vous attend, exactement là où vous l'avez laissé",
    corps: (lien) => `
      <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;">Vous avez commencé votre analyse de besoins financiers — <strong>tout est sauvegardé</strong>. Il reste quelques étapes pour voir votre portrait complet : votre nombre d'indépendance financière (NIF), votre trajectoire de retraite et vos protections.</p>
      <p style="margin:0 0 16px;font-size:14.5px;line-height:1.65;">Ça prend environ 5 minutes.</p>
      <p style="margin:0;"><a href="${lien}" style="display:inline-block;background:#279B70;color:#ffffff;text-decoration:none;font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:10px;">Reprendre mon analyse →</a></p>`,
  },
  {
    type: "relance_72h", heures: 72,
    sujet: "Ce que votre portrait complet vous montrera — MonPlanFin",
    titre: "Un aperçu de ce qui vous attend",
    corps: (lien) => `
      <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;">En complétant votre analyse, vous obtenez :</p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.75;color:#243044;">
        <li>votre <strong>NIF</strong> — le capital pour vivre de vos placements ;</li>
        <li>votre <strong>trajectoire de retraite</strong> année par année (RRQ, PSV, épargne) ;</li>
        <li>votre <strong>budget consolidé</strong> et vos protections à évaluer ;</li>
        <li>la possibilité de faire <strong>valider le tout par un conseiller partenaire inscrit à l'AMF</strong> — sans engagement.</li>
      </ul>
      <p style="margin:0 0 12px;"><a href="${lien}" style="display:inline-block;background:#279B70;color:#ffffff;text-decoration:none;font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:10px;">Compléter mon portrait →</a></p>
      <p style="margin:0;font-size:13px;color:#5b6678;">Un aperçu tout de suite ? <a href="${SITE}/portrait" style="color:#279B70;font-weight:600;">Voir mon portrait NIF partiel</a> — avec ce que vous avez déjà saisi.</p>`,
  },
  {
    type: "relance_7j", heures: 168,
    sujet: "Dernier rappel — votre analyse reste disponible",
    titre: "On ne vous relancera plus après ce courriel",
    corps: (lien) => `
      <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;">C'est notre dernière relance — promis. Votre analyse reste sauvegardée dans votre compte : vous pouvez la terminer quand vous voulez, à votre rythme.</p>
      <p style="margin:0;"><a href="${lien}" style="display:inline-block;background:#279B70;color:#ffffff;text-decoration:none;font-weight:700;font-size:14.5px;padding:12px 22px;border-radius:10px;">Terminer mon analyse →</a></p>`,
  },
];

function gabarit(titre: string, corpsHtml: string, lienDesabo: string): string {
  return `<!doctype html><html lang="fr-CA"><body style="margin:0;padding:0;background:#f4f6f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;border:1px solid #e6e9ef;">
<tr><td style="padding:26px 32px 18px;border-bottom:1px solid #eef1f5;">
  <img src="${SITE}/favicon.png" width="34" height="28" alt="MonPlanFin" style="vertical-align:middle;border:0;">
  <span style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:19px;font-weight:700;vertical-align:middle;margin-left:8px;">
    <span style="color:#0B1428;">Mon</span><span style="color:#5BC4A0;">PlanFin</span>
  </span>
</td></tr>
<tr><td style="padding:26px 32px;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#243044;">
  <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#0B1428;">${titre}</h1>
  ${corpsHtml}
</td></tr>
<tr><td style="padding:18px 32px 24px;border-top:1px solid #eef1f5;font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:11.5px;color:#8a94a6;line-height:1.6;">
  MonPlanFin — outil éducatif d'estimation financière · Québec, Canada<br>
  Ceci n'est pas un conseil financier personnalisé. Questions ? <a href="${SITE}/contact" style="color:#5BC4A0;">Nous joindre</a>.<br>
  Vous recevez ce courriel parce que vous avez créé un compte sur monplanfin.ca.
  <a href="${lienDesabo}" style="color:#8a94a6;text-decoration:underline;">Ne plus recevoir ces rappels (désabonnement en 1 clic)</a>.
</td></tr>
</table></td></tr></table></body></html>`;
}

// HMAC-SHA256(email) avec le service role comme secret → même dérivation dans
// la fonction `desabonnement`. La clé ne quitte jamais le serveur.
async function jetonDesabo(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  try {
    const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
    if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant");
    const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

    // 1) Données (service role — lecture interne, agrégats/emails seulement)
    const [optRes, logRes, profRes, dossRes] = await Promise.all([
      fetch(`${URL_}/rest/v1/courriel_optout?select=courriel`, { headers: H }),
      fetch(`${URL_}/rest/v1/email_log?select=courriel,type&type=in.(relance_24h,relance_72h,relance_7j)`, { headers: H }),
      fetch(`${URL_}/rest/v1/financial_profile?select=created_by,section`, { headers: H }),
      fetch(`${URL_}/rest/v1/lead_dossier?select=created_by`, { headers: H }),
    ]);
    const optout = new Set((await optRes.json()).map((r: { courriel: string }) => r.courriel.toLowerCase()));
    const dejaEnvoye = new Set((await logRes.json()).map((r: { courriel: string; type: string }) => `${r.courriel.toLowerCase()}|${r.type}`));
    const aDossier = new Set((await dossRes.json()).map((r: { created_by: string | null }) => (r.created_by || "").toLowerCase()).filter(Boolean));
    const sections = new Map<string, Set<string>>();
    for (const r of await profRes.json() as Array<{ created_by: string | null; section: string | null }>) {
      const e = (r.created_by || "").toLowerCase();
      if (!e || !r.section || !SECTIONS_CANON.includes(r.section)) continue;
      if (!sections.has(e)) sections.set(e, new Set());
      sections.get(e)!.add(r.section);
    }

    // 2) Âge des comptes (GoTrue admin — pagination simple, suffisant à cette échelle)
    const comptes = new Map<string, number>(); // email → heures depuis création
    for (let page = 1; page <= 10; page++) {
      const r = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=100`, { headers: H });
      const j = await r.json();
      const users: Array<{ email?: string; created_at?: string }> = j.users || [];
      for (const u of users) {
        if (u.email && u.created_at) comptes.set(u.email.toLowerCase(), (Date.now() - new Date(u.created_at).getTime()) / 3600000);
      }
      if (users.length < 100) break;
    }

    // 3) Sélection + envoi (max UNE relance par compte par passage : la plus
    //    précoce non envoyée dont l'échéance est atteinte)
    const envoyes: string[] = [];
    for (const [email, secs] of sections) {
      if (optout.has(email) || aDossier.has(email)) continue;
      const n = secs.size;
      if (n === 0 || n >= NB_CANON) continue;                 // pas commencé / déjà complet
      const age = comptes.get(email);
      if (age === undefined) continue;
      const etape = ETAPES.find(e => age >= e.heures && !dejaEnvoye.has(`${email}|${e.type}`));
      if (!etape) continue;

      const t = await jetonDesabo(email, KEY);
      const lienDesabo = `${URL_}/functions/v1/desabonnement?e=${encodeURIComponent(btoa(email))}&t=${t}`;
      const html = gabarit(etape.titre, etape.corps(`${SITE}/analyse`), lienDesabo);
      const rs = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EXPEDITEUR, to: [email], subject: etape.sujet, html, reply_to: "bonjour@monplanfin.ca" }),
      });
      if (!rs.ok) { console.error(`Resend ${rs.status} pour ${etape.type}`); continue; }

      await fetch(`${URL_}/rest/v1/email_log`, {
        method: "POST",
        headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ courriel: email, type: etape.type, sujet: etape.sujet }),
      });
      envoyes.push(`${etape.type}`);
      if (envoyes.length >= 50) break;                        // garde-fou débit par passage
    }

    return new Response(JSON.stringify({ ok: true, envoyes: envoyes.length }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("relances-abf:", e);
    return new Response(JSON.stringify({ ok: false, erreur: String((e as Error).message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
