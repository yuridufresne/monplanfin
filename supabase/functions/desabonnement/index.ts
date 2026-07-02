// ============================================================================
// [P2 gameplan] Edge Function `desabonnement` — désabonnement 1 clic (LCAP)
// ----------------------------------------------------------------------------
// Lien présent dans CHAQUE relance : GET ?e=<base64(email)>&t=<hmac>.
// Vérifie le jeton (HMAC-SHA256 de l'email, secret = service role — même
// dérivation que dans `relances-abf`), inscrit l'email dans `courriel_optout`
// (respecté partout), et affiche une page de confirmation en FRANÇAIS.
// Effet IMMÉDIAT (LCAP exige ≤10 jours — on fait mieux).
//
// ⚠️ DÉPLOIEMENT : cette fonction est PUBLIQUE (clic depuis un courriel, pas de
// session) → déployer avec verify_jwt DÉSACTIVÉ :
//   CLI : supabase functions deploy desabonnement --no-verify-jwt
//   Dashboard : Function → Details → « Enforce JWT verification » = OFF.
// Zéro import : self-contained (collable dans l'éditeur Dashboard).
// ============================================================================

const SITE = "https://monplanfin.ca";

function page(titre: string, message: string): Response {
  const html = `<!doctype html><html lang="fr-CA"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre} — MonPlanFin</title></head>
<body style="margin:0;background:#050810;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#EDEFF2;">
<div style="max-width:520px;margin:80px auto;padding:40px 32px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:18px;text-align:center;">
  <img src="${SITE}/favicon.png" width="40" height="33" alt="MonPlanFin" style="border:0;">
  <div style="font-size:20px;font-weight:700;margin:10px 0 22px;"><span style="color:#EDEFF2;">Mon</span><span style="color:#5BC4A0;">PlanFin</span></div>
  <h1 style="font-size:20px;margin:0 0 12px;color:#fff;">${titre}</h1>
  <p style="font-size:14.5px;line-height:1.65;color:rgba(255,255,255,0.7);margin:0 0 24px;">${message}</p>
  <a href="${SITE}" style="color:#5BC4A0;font-weight:600;text-decoration:none;">Retour à monplanfin.ca →</a>
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function jetonAttendu(email: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.toLowerCase()));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const e64 = u.searchParams.get("e") || "";
    const t = u.searchParams.get("t") || "";
    let email = "";
    try { email = atob(e64).toLowerCase().trim(); } catch { /* lien invalide */ }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !t) {
      return page("Lien invalide", "Ce lien de désabonnement est incomplet ou expiré. Écrivez-nous à bonjour@monplanfin.ca et nous vous retirerons manuellement.");
    }

    const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const URL_ = Deno.env.get("SUPABASE_URL") ?? "";
    if (t !== await jetonAttendu(email, KEY)) {
      return page("Lien invalide", "Ce lien de désabonnement n'a pas pu être vérifié. Écrivez-nous à bonjour@monplanfin.ca et nous vous retirerons manuellement.");
    }

    // Upsert idempotent (recliquer = même résultat)
    await fetch(`${URL_}/rest/v1/courriel_optout?on_conflict=courriel`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ courriel: email, source: "lien_relance" }),
    });

    return page("Vous êtes désabonné(e)", "C'est fait — vous ne recevrez plus de rappels de MonPlanFin. Les courriels transactionnels (ex. accusé de réception d'un dossier que vous soumettez) restent envoyés. Vous pouvez vous réabonner en nous écrivant à bonjour@monplanfin.ca.");
  } catch (e) {
    console.error("desabonnement:", e);
    return page("Petit pépin", "Une erreur est survenue. Réessayez, ou écrivez-nous à bonjour@monplanfin.ca et nous vous retirerons manuellement.");
  }
});
