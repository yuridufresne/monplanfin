import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/consent";

/**
 * SeoManager — met à jour titre + meta (<description>, Open Graph, Twitter,
 * canonical) selon la route. Centralisé, typé, sans dépendance. Aide Google
 * (qui exécute le JS) à indexer chaque page avec un titre/description uniques.
 * Les balises OG du HTML statique (index.html) restent le filet pour les robots
 * sociaux qui n'exécutent pas le JS — celles-ci les enrichissent côté client.
 */
const SITE = "https://monplanfin.ca";

interface Meta { title: string; description: string }

const SEO: Record<string, Meta> = {
  "/": {
    title: "MonPlanFin — Votre indépendance financière, en un chiffre",
    description:
      "Estimez en 10 minutes le montant qu'il vous faut pour être financièrement indépendant — votre Numéro d'Indépendance Financière (NIF) — avec un plan révisé par un conseiller encadré par l'AMF. Gratuit, au Québec.",
  },
  "/calculatrices": {
    title: "Calculatrices financières gratuites — MonPlanFin",
    description:
      "Calculez votre impôt, votre capacité d'emprunt, vos placements et votre retraite avec les calculatrices gratuites de MonPlanFin, adaptées au Québec 2026.",
  },
  "/education": {
    title: "Éducation financière — MonPlanFin",
    description:
      "Apprenez les bases des finances personnelles au Québec : REER, CELI, impôt, immobilier, retraite. Des leçons claires pour reprendre le contrôle de votre argent.",
  },
  "/methodologie": {
    title: "Notre méthodologie — MonPlanFin",
    description:
      "Comment MonPlanFin estime votre Numéro d'Indépendance Financière : tables fiscales du Québec, prestations RRQ/PSV, et révision par un conseiller encadré par l'AMF.",
  },
  "/contact": {
    title: "Nous joindre — MonPlanFin",
    description: "Une question sur votre dossier ou votre estimation ? Contactez l'équipe de MonPlanFin.",
  },
  "/confidentialite": {
    title: "Politique de confidentialité — MonPlanFin",
    description: "Comment MonPlanFin protège vos données personnelles et financières, conformément à la Loi 25 du Québec.",
  },
  "/conditions": {
    title: "Conditions d'utilisation — MonPlanFin",
    description: "Les conditions d'utilisation du service MonPlanFin.",
  },
  // Pages privées : surtout pour le titre d'onglet (pas indexées).
  "/dashboard": { title: "Mon tableau de bord — MonPlanFin", description: "Votre portrait financier et votre Numéro d'Indépendance Financière." },
  "/analyse": { title: "Mon analyse financière — MonPlanFin", description: "Complétez votre dossier pour estimer votre NIF." },
  "/budget": { title: "Mon budget — MonPlanFin", description: "Votre budget mensuel et votre capacité d'épargne." },
  "/immobilier": { title: "Immobilier — MonPlanFin", description: "Votre capacité d'achat et votre équité immobilière." },
  "/protection": { title: "Assurance & protection — MonPlanFin", description: "Vos besoins de couverture, sans angle mort." },
  "/investments": { title: "Mes placements — MonPlanFin", description: "Le suivi de votre portefeuille de placements." },
  "/resume": { title: "Feuille de résumé — MonPlanFin", description: "Le résumé de votre dossier financier." },
};

const DEFAUT = SEO["/"];

function upsertByName(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function upsertByProp(prop: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", "canonical"); document.head.appendChild(el); }
  el.setAttribute("href", href);
}

export default function SeoManager() {
  const { pathname } = useLocation();
  const premier = useRef(true);
  useEffect(() => {
    const m = SEO[pathname] || DEFAUT;
    const url = SITE + (pathname === "/" ? "/" : pathname);
    document.title = m.title;
    upsertByName("description", m.description);
    upsertByProp("og:title", m.title);
    upsertByProp("og:description", m.description);
    upsertByProp("og:url", url);
    upsertByName("twitter:title", m.title);
    upsertByName("twitter:description", m.description);
    upsertCanonical(url);

    // PageView marketing par changement de route (gardé par le consentement).
    // On saute le 1er rendu : le PageView initial est émis par le pixel lui-même.
    if (premier.current) premier.current = false;
    else trackPageView();
  }, [pathname]);
  return null;
}
