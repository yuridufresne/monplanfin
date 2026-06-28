# Contexte projet — MonPlanFin (à respecter par l'agent)

## Avant tout
- TOUJOURS exécuter `git pull origin main` AVANT de modifier quoi que ce soit.
  `main` est souvent en avance sur le local (Base44 auto-commit vers GitHub + push récents).
- NE JAMAIS force-push sur `main`.

## Ne pas régresser (CRITIQUE)
- NE PAS toucher à la route `/analyse` : c'est la refonte ABF FINALE déjà déployée
  (copie du prototype Open Design, 11 étapes typées). Ne pousse AUCUN autre wizard dessus.
  (`/analyse2` contient une version antérieure `AnalyseABF` — laisser les deux tels quels
  sauf demande explicite de Yuri.)
- NE PAS merger ces branches sur `main` (elles sont derrière main → régression auth/ABF/SEO) :
  `backup-securite`, `improvements-v2`, `securisation-tests`.

## Auth Google = déjà fonctionnelle (ne pas modifier)
- Connexion Google configurée au niveau plateforme (Google Cloud OAuth + provider Google
  activé dans Supabase). `signInWithGoogle` dans `src/lib/AuthContext` marche tel quel.
  Aucun changement de code requis pour l'auth Google.

## Hors périmètre code
- Email / DNS / certificat SSL (`mailpro7.swhc.ca`, `media@monplanfin.ca`, MX) = côté
  hébergeur (WHC/cPanel). Pas de correctif applicatif pour ça.

## Architecture / déploiement
- **Production = Vercel** (projet `monplan-fin`), connecté à GitHub. Chaque push sur `main`
  → **Vercel redéploie AUTOMATIQUEMENT** → en ligne sur monplanfin.ca en ~1-2 min.
  ⚠️ Donc un push sur `main` part DIRECT en prod : pas de tampon « brouillon ». Prudence.
- Base44 = éditeur seulement (auto-commit aussi vers `main`) → `main` peut bouger sans action
  locale → d'où la règle "pull d'abord". Il N'Y A PAS de « Publish Base44 » pour le site.
- SSOT : pas de doublon de moteur de calcul. Brancher sur les moteurs existants
  (`clientPayload`, `calcNIF`, `sectionsRetraite`, `moteurFiscal2026`, etc.).

## Outils & rôles
- Open Design (Opus 4.8) = conception/prototypage. Cursor / Claude Code = code dans ce dépôt.
  Cowork = navigateur (Google/Supabase/Vercel), vérifs, visuels.
- Un seul agent à la fois sur les mêmes fichiers.
