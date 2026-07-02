// ============================================================================
// [P2 gameplan] Edge Function `accuse-dossier` — accusé de soumission (Resend)
// ----------------------------------------------------------------------------
// Invoquée par le front (utilisateur AUTHENTIFIÉ) juste après l'enregistrement
// réussi d'un LeadDossier. ⚠️ DÉPLOYER verify_jwt OFF : le projet utilise les
// clés JWT ASYMÉTRIQUES et la vérif plateforme « legacy secret » rejette les
// jetons (UNAUTHORIZED_ASYMMETRIC_JWT) — l'auth est faite IN-FUNCTION via
// GoTrue /auth/v1/user (401 sinon). Envoie :
//   1. l'ACCUSÉ DE RÉCEPTION au client (transactionnel, FR, brandé) ;
//   2. la NOTIFICATION à l'admin (nouveau dossier dans /admin/dossiers).
// Trace les deux envois dans `email_log` (idempotence + preuve — Loi 25/LCAP).
//
// Secrets (Dashboard → Edge Functions → Secrets) :
//   RESEND_API_KEY          (déposée par Yuri — JAMAIS dans le repo/bundle)
//   ADMIN_NOTIF_COURRIEL    (optionnel — défaut : bonjour@monplanfin.ca)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement.
//
// Zéro import : self-contained → déployable par copier-coller dans l'éditeur
// Dashboard (ou `supabase functions deploy accuse-dossier`).
// ============================================================================

const EXPEDITEUR = "MonPlanFin <bonjour@monplanfin.ca>";
const SITE = "https://monplanfin.ca";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Gabarit brandé (email-safe : tables + styles inline ; logo + wordmark,
//    français d'abord — règles inviolables CLAUDE.md) ───────────────────────
function gabarit(titre: string, corpsHtml: string, piedExtra = ""): string {
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
  Ceci n'est pas un conseil financier personnalisé. Questions ? <a href="${SITE}/contact" style="color:#5BC4A0;">Nous joindre</a>.
  ${piedExtra}
</td></tr>
</table></td></tr></table></body></html>`;
}

async function envoyerResend(apiKey: string, a: { to: string; subject: string; html: string; replyTo?: string }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EXPEDITEUR, to: [a.to], subject: a.subject, html: a.html, reply_to: a.replyTo }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function loguer(supabaseUrl: string, serviceKey: string, courriel: string, type: string, sujet: string) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/email_log`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ courriel, type, sujet }),
    });
  } catch (_) { /* le log ne doit jamais bloquer l'envoi */ }
}

const esc = (s: unknown) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant (Secrets)");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ADMIN = Deno.env.get("ADMIN_NOTIF_COURRIEL") || "bonjour@monplanfin.ca";

    // ── AUTH IN-FUNCTION (bug UNAUTHORIZED_ASYMMETRIC_JWT, journal 2026-07-02) ──
    // Le projet utilise les clés JWT ASYMÉTRIQUES : la vérif plateforme « Verify
    // JWT with legacy secret » rejette les jetons de session → la fonction est
    // déployée verify_jwt OFF (assumé) et valide ELLE-MÊME le jeton : GoTrue
    // /auth/v1/user avec l'Authorization reçu (supabase-js l'envoie d'office).
    // 401 si absent/invalide → l'endpoint n'est PAS public pour autant.
    const authHeader = req.headers.get("Authorization") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const uRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: ANON_KEY },
    });
    if (!uRes.ok) {
      return new Response(JSON.stringify({ ok: false, erreur: "non authentifié" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const b = await req.json();
    const courriel = String(b.client_courriel || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) throw new Error("courriel client invalide");
    const nom = esc(b.client_nom || "");
    const prenom = esc(String(b.client_nom || "").split(" ")[0] || "");
    const besoins = Array.isArray(b.besoins) ? b.besoins.slice(0, 12).map(esc).join(", ") : "";
    const contactPref = [esc(b.mode_label || ""), esc(b.moment_label || "")].filter(Boolean).join(", ");

    // 1) Accusé au client (transactionnel)
    const sujetClient = "Votre dossier est bien reçu — MonPlanFin";
    await envoyerResend(RESEND_API_KEY, {
      to: courriel,
      subject: sujetClient,
      replyTo: "bonjour@monplanfin.ca",
      html: gabarit(`C'est reçu${prenom ? ", " + prenom : ""} — on s'occupe du reste`, `
        <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;">Votre dossier a été transmis avec succès. Voici la suite :</p>
        <ol style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7;color:#243044;">
          <li><strong>Jumelage</strong> — on choisit un conseiller partenaire inscrit à l'AMF, adapté à vos besoins.</li>
          <li><strong>Prise de contact</strong> — il vous joint <strong>d'ici 48 h ouvrables</strong>${contactPref ? " (" + contactPref + ")" : ""}.</li>
          <li><strong>Validation de votre plan</strong> — avec votre estimation en main.</li>
        </ol>
        ${besoins ? `<p style="margin:0 0 12px;font-size:13px;color:#5b6678;">Besoins précisés : ${besoins}.</p>` : ""}
        <p style="margin:0;font-size:13px;color:#5b6678;">Sans engagement. Vous pouvez répondre directement à ce courriel.</p>`,
        `<br>Vous recevez ce courriel parce que vous avez soumis votre dossier sur monplanfin.ca (consentement du ${new Date().toLocaleDateString("fr-CA")}).`),
    });
    await loguer(SUPABASE_URL, SERVICE_KEY, courriel, "accuse_soumission", sujetClient);

    // 2) Notification admin
    const sujetAdmin = `Nouveau dossier soumis — ${nom || courriel}`;
    await envoyerResend(RESEND_API_KEY, {
      to: ADMIN,
      subject: sujetAdmin,
      html: gabarit("Nouveau dossier à assigner", `
        <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;"><strong>${nom || "(sans nom)"}</strong> · ${esc(courriel)}</p>
        ${besoins ? `<p style="margin:0 0 12px;font-size:13.5px;">Besoins : ${besoins}</p>` : ""}
        ${contactPref ? `<p style="margin:0 0 12px;font-size:13.5px;">Contact souhaité : ${contactPref}</p>` : ""}
        <p style="margin:0;"><a href="${SITE}/admin/dossiers" style="color:#5BC4A0;font-weight:600;">Ouvrir la file des dossiers →</a></p>`),
    });
    await loguer(SUPABASE_URL, SERVICE_KEY, ADMIN, "notif_admin_dossier", sujetAdmin);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("accuse-dossier:", e);
    return new Response(JSON.stringify({ ok: false, erreur: String((e as Error).message || e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
