/**
 * Gestion du consentement aux témoins (cookies) — par FINALITÉ (Loi 25).
 *
 * - Essentiels : toujours actifs (connexion, sécurité) — pas de consentement requis.
 * - Marketing & mesure : Google Analytics + (futur) pixels publicitaires.
 *   N'est chargé QU'APRÈS consentement explicite. Aucun script marketing ne
 *   s'exécute avant le choix de l'utilisateur (pas de case pré-cochée).
 *
 * Le tag Google Analytics a été RETIRÉ de index.html : il est injecté ici
 * uniquement si la finalité « marketing » est consentie.
 */
const KEY = "mpf-cookies-consent";
const GA_ID = "G-P963K15GZF";
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
const META_PIXEL_ID = ENV.VITE_META_PIXEL_ID || "2132766237676991";

export interface ConsentState {
  marketing: boolean;
  date: string;
}

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

/** Enregistre le choix et applique immédiatement (charge ou désactive le marketing). */
export function setConsent(marketing: boolean): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ marketing, date: new Date().toISOString() }));
  } catch { /* noop */ }
  if (marketing) loadMarketing();
  else disableMarketing();
}

/** Efface le choix (la bannière réapparaîtra ; le marketing reste désactivé). */
export function clearConsent(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  disableMarketing();
}

/** Au chargement de l'app : applique un consentement déjà donné. */
export function applyStoredConsent(): void {
  const c = getConsent();
  if (c?.marketing) loadMarketing();
}

let marketingCharge = false;

function loadMarketing(): void {
  if (marketingCharge || typeof document === "undefined") return;
  marketingCharge = true;

  // Google Analytics
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { w.dataLayer!.push(arguments); };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, { anonymize_ip: true });

  // Meta Pixel — chargé seulement si un ID est configuré (VITE_META_PIXEL_ID)
  if (META_PIXEL_ID) loadMetaPixel(META_PIXEL_ID);
}

function disableMarketing(): void {
  try {
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
  } catch { /* noop */ }
}

// ── Meta Pixel (préparé pour quand l'ID sera fourni) ────────────────────────
function loadMetaPixel(pixelId: string): void {
  const w = window as unknown as { fbq?: ((...a: unknown[]) => void) & Record<string, unknown>; _fbq?: unknown };
  if (w.fbq) return;
  const n = function (...args: unknown[]) {
    const f = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
    if (f.callMethod) f.callMethod(...args);
    else f.queue.push(args);
  } as unknown as ((...a: unknown[]) => void) & { push?: unknown; loaded?: boolean; version?: string; queue: unknown[] };
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  w.fbq = n as unknown as typeof w.fbq;
  w._fbq = w._fbq || n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
  w.fbq!("init", pixelId);
  w.fbq!("track", "PageView");
}

/** Envoie un événement marketing (Meta + GA) si le consentement est donné. */
export function trackEvent(nom: string, params?: Record<string, unknown>): void {
  if (!getConsent()?.marketing) return;
  const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
  if (w.fbq) w.fbq("track", nom, params);
  if (w.gtag) w.gtag("event", nom, params);
}

/**
 * PageView à chaque changement de route (SPA react-router) — UNIQUEMENT si le
 * consentement marketing est donné. Le PageView INITIAL est déjà émis par
 * loadMetaPixel ; SeoManager saute donc le premier rendu pour éviter le doublon.
 */
export function trackPageView(): void {
  if (!getConsent()?.marketing) return;
  const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
  if (w.fbq) w.fbq("track", "PageView");
  if (w.gtag) w.gtag("event", "page_view");
}
