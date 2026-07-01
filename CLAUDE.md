# Contexte projet — MonPlanFin (à respecter par l'agent)

## Avant tout
- TOUJOURS exécuter `git pull origin main` AVANT de modifier quoi que ce soit.
  `main` est souvent en avance sur le local (Base44 auto-commit vers GitHub + push récents).
- **LIRE `JOURNAL-AGENTS.md` (racine) avant chaque tâche** pour voir ce que les autres agents (Cowork,
  Claude Code, Cursor, Open Design) ont fait.
- **OBLIGATOIRE — après CHAQUE tâche, AVANT de signaler que c'est terminé** : ajouter une entrée EN HAUT de
  `JOURNAL-AGENTS.md` (date/heure, agent, ce qui est fait, branche, « → Pour les autres », « ⚠️ Attention »)
  **puis commit/push** ce fichier. Pas de tâche « finie » sans entrée au journal.
- NE JAMAIS force-push sur `main`.

## 🔒 Verrou « un seul agent à la fois » (OBLIGATOIRE — checkout PARTAGÉ)
Le dépôt est un **checkout partagé** : Cowork, Claude Code et Cursor éditent le **même répertoire**.
Deux agents actifs en même temps **s'écrasent** : edits non commités perdus, et un `git checkout`/`reset`/
switch de branche d'un agent **efface le travail non commité** de l'autre (c'est déjà arrivé). Donc :
1. **AVANT de commencer** : `bash scripts/agent-lock.sh status`.
   - Si **tenu par un autre agent** (< 2 h) → **NE PAS travailler.** Attendre, ou se coordonner via `JOURNAL-AGENTS.md`.
2. Si **libre** (ou périmé >2 h) : `bash scripts/agent-lock.sh claim "<TonNom>"` (ex. `"Claude Code"`, `"Cowork"`, `"Cursor"`).
3. **NE JAMAIS** faire `git checkout` / `git reset` / switch de branche / `git add -A` **sans tenir le verrou**
   (tu écraserais/embarquerais le travail non commité d'un autre agent).
4. **APRÈS ta tâche** (commit + push + entrée journal faits) : `bash scripts/agent-lock.sh release`.
Le verrou = fichier LOCAL `.agent-lock` (dans `.gitignore`, jamais commité, visible instantanément par tous
les agents du même répertoire). Il s'auto-expire après 120 min.

## Ne pas régresser (CRITIQUE)
- NE PAS toucher à la route `/analyse` : c'est la refonte ABF FINALE déjà déployée
  (copie du prototype Open Design, 11 étapes typées). Ne pousse AUCUN autre wizard dessus.
  (`/analyse2` contient une version antérieure `AnalyseABF` — laisser les deux tels quels
  sauf demande explicite de Yuri.)
- NE PAS merger ces branches sur `main` (elles sont derrière main → régression auth/ABF/SEO) :
  `backup-securite`, `improvements-v2`, `securisation-tests`.

## Gate typecheck & quarantaine `@ts-nocheck` (NE PAS « corriger » par erreur)
- **Le gate CI** = `npm run typecheck:lib` (scope = `tsconfig.lib.json`, doit **rester à 0**). Il ne
  couvre PAS tout le repo : seulement les dossiers listés dans l'`include` (moteurs `src/lib`, `src/api`,
  `src/hooks`, `src/components/{dashboard,home,feedback,examples,investments}`). On l'étend un dossier à
  la fois, seulement quand ce dossier est déjà à 0 erreur.
- **`src/components/ui/**` = primitives shadcn VENDORED** (code tiers copié, modèle shadcn). Les 49
  fichiers lowercase portent `// @ts-nocheck` **volontairement** : ça coupe leurs erreurs de types
  internes (~451) et empêche qu'elles « fuient » vers nos fichiers qui les importent. **Zéro impact
  runtime/build** (juste la vérif de types). ⚠️ **NE PAS retirer ces `@ts-nocheck` ni essayer de « typer »
  ces fichiers** : c'est l'état final assumé, PAS une dette à rembourser. `ui/**` n'entre JAMAIS dans le gate.
- **Exception :** nos 4 composants MAISON dans `ui/` (PascalCase : `AddressAutocomplete`, `CookieConsent`,
  `FlipCard`, `InfoTooltip`) ne sont **pas** en quarantaine → eux, on peut les typer/gater un jour.
- **Reste à gater (vraies erreurs de NOTRE code, à corriger avant d'ajouter au gate)** : `src/pages`,
  `src/components/{budget,calculators,layout}`. **`src/components/abf/**` reste hors gate** (territoire
  `/analyse` figé — ne pas y toucher).

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

## Statut AMF / conformité (CRITIQUE pour le contenu & le branding)
- MonPlanFin = **outil ÉDUCATIF** (estimations générales). Tant qu'il **ne vend pas de produit**, n'est
  **pas un cabinet inscrit** et ne donne **pas de conseil personnalisé** → **hors du régime d'inscription AMF**.
- **NE JAMAIS** utiliser le titre réservé « **planificateur financier** » (ni se présenter en « conseiller
  financier ») dans l'UI, le SEO, les pubs. Rester « **estimateur / outil éducatif** ».
- **Garder le disclaimer** « ceci n'est pas un conseil financier personnalisé » sur les pages d'analyse.
- **NE PAS** afficher « Membre AMF » (faux : non inscrit). Pas de promesse de rendement.
- Détails + statut Loi 25/sécu : voir `conformite/NOTES-AMF-et-statut-conformite.md`.

## Outils & rôles
- Open Design (Opus 4.8) = conception/prototypage. Cursor / Claude Code = code dans ce dépôt.
  Cowork = navigateur (Google/Supabase/Vercel), vérifs, visuels.
- Un seul agent à la fois sur les mêmes fichiers.
