# 📓 Journal de passation entre agents — MonPlanFin

**But :** que Cowork, Claude Code, Cursor et Open Design sachent ce que les autres ont fait,
ce qui est en cours, et ce qui les attend — **sans se marcher dessus**.

## Protocole (OBLIGATOIRE pour chaque agent)
1. **AVANT de commencer** une tâche : `git pull origin main`, puis **lire les 2-3 dernières entrées ci-dessous**.
2. **APRÈS ta tâche** : ajouter **une nouvelle entrée EN HAUT** de la liste (la plus récente en premier).
3. **Commit + push** ce fichier avec ton travail (sinon les autres ne le voient pas).
4. Si une action attend un autre agent, l'écrire clairement sous **« → Pour les autres »**.

**Format d'une entrée :**
```
## AAAA-MM-JJ HH:MM — [AGENT]
- Fait : …
- En cours / branche : …
- → Pour les autres : …
- ⚠️ Attention : …
```
---

## 2026-06-30 00:10 — Claude Code (commit docs : brief Open Design)
- **Fait :** committé `BRIEF-OPEN-DESIGN.md` (garde-fous design de Cowork) + docs conformité. Aucun code applicatif touché, SQL Studio non relancé.
- **ℹ️ Mise à jour pour Cowork/Open Design :** la tâche **LOGO est DÉJÀ FAITE et mergée en prod** (vraie icône favicon bleu nuit via `BrandIcon` + « MonPlanFin » en un mot) — conforme au brief (wordmark Mon/PlanFin vert + carré bleu nuit). La branche `fix/monogram-coherence` (mauvais symbole) a été **supprimée**, pas mergée.

## 2026-06-30 00:04 — Claude Code (logo mergé : vraie icône + « MonPlanFin » en un mot)
- **Fait (mergé en prod, `b45587f`) :** `fix/logo-vraie-icone`.
  - Vraie icône de marque (`favicon.svg` via composant `BrandIcon`) dans Navbar (desktop+mobile) + Footer, à la place du carré doré « MP ».
  - **Fix « MonPlanFin » en UN mot** : le conteneur logo en `flex gap:10` séparait « Mon » et « PlanFin » (lu « Mon PlanFin ») → wrapper `nowrap` = collés. Vérifié en aperçu local.
- **→ Pour Yuri/Cowork :** branding cohérent (nom 1 mot + vraie icône partout). Reste optionnel : faire « pop » davantage l'icône sur fond sombre (symbole sans le carré bleu) si souhaité.

## 2026-06-29 23:54 — Claude Code (vraie icône de marque)
- **Fait (branche EN PREVIEW) :** `fix/logo-vraie-icone`. Remplacé les 3 carrés « MP » dorés par la **vraie icône** `public/favicon.svg` (carré bleu nuit + cible + courbe verte + point doré) via un composant `BrandIcon` (SVG inline, prop `size`) : Navbar desktop (40) + mobile (30) + Footer (32). Wordmark « Mon » blanc + « PlanFin » vert conservé. lint vert, build OK.
- **Note :** branche obsolète `fix/monogram-coherence` (mauvais symbole, le MP doré) **supprimée** sur Cowork's instruction.
- **→ Pour Yuri/Cowork :** valider la Preview → « merge ».

## 2026-06-29 (LOGO) — Cowork (demande de Yuri : icône incohérente)
- **Constat (validé par Yuri sur la Preview `fix/monogram-coherence`) :** le wordmark « Mon » (blanc) + « PlanFin » (vert) est BON.
  Mais l'**icône** à gauche (nav + footer) est un **carré DORÉ « MP »**, alors que la **vraie icône de marque** est
  `public/favicon.svg` = **carré bleu nuit** (`hsl(226 44% 8%)`) avec **cible + courbe verte montante + point doré**
  (celle de l'onglet navigateur et des profils sociaux). → 2 logos différents = incohérent.
- ⚠️ **NE PAS merger `fix/monogram-coherence`** : elle a uniformisé le **mauvais** symbole (le MP doré).
- **→ Pour Claude Code (nouvelle branche, pas main, PAS `/analyse`) :**
  - Remplacer le monogramme « MP » dans **Navbar** ET **Footer** par la **vraie icône `public/favicon.svg`** (même symbole partout : onglet, réseaux, nav, footer).
  - Garder le wordmark « Mon » blanc + « PlanFin » vert tel quel. Affichage seulement. Diff avant commit → Preview, pas de merge sans validation.

## 2026-06-29 23:38 — Claude Code (règle journal obligatoire + monogramme)
- **Fait :** commit de la **règle renforcée** (Cowork) dans `CLAUDE.md` + `.cursorrules` : *OBLIGATOIRE — après CHAQUE tâche, AVANT de signaler la fin → entrée en haut du journal + commit/push*. Je l'applique désormais systématiquement.
- **En cours / branche :** `fix/monogram-coherence` (EN PREVIEW) — monogramme « MP » uniformisé (dégradé doré + MP sombre) sur Navbar desktop + Footer (mobile déjà conforme).
- **→ Pour Yuri/Cowork :** valider la Preview monogramme → « merge ».

## 2026-06-29 23:31 — Claude Code (cohérence wordmark)
- **Fait (mergé en prod, `bd6bdef`) :** audit logos + nom du site. « MonPlanFin » déjà cohérent partout (title/OG/Schema/UI). Corrigé 2 écarts du wordmark « PlanFin » vert (directive 8400f02) : ResetPassword (était doré) + Footer (était tout blanc → Mon blanc + PlanFin vert).
- **→ Pour les autres :** monogramme « MP » a un léger écart de couleur Navbar vs Footer/mobile — laissé (cosmétique/voulu) ; à uniformiser si Yuri le veut.

## 2026-06-29 23:25 — Claude Code (merges #3 + UX-2)
- **Fait (mergés en prod) :**
  - **#3 en-tête dashboard** `feat/dashboard-header-cleanup` mergé (`d59f857`) : actions secondaires dans le menu ⚙️ + liens footer.
  - **UX-2 nav Studio admin** `feat/nav-studio-admin` mergé (`9d17b97`) : lien « 🎛️ Studio » admin-only + bypass entitlement admin.
  - Disjoints (Dashboard/Footer vs App/Navbar) → rebasés sur main puis ff, lint vert, build OK. Branches supprimées.
- **→ Pour Yuri/Cowork :** la file de Cowork est **vidée**. Reste plus tard : « Supprimer mon compte » + export JSON/CSV (Loi 25).
- ℹ️ Analyse (sans action) : `moteurDecaissementAvance.ts` de DeepSeek = **non fonctionnel** (mauvaise signature `calculateFullTax` → impôt 0/NaN). Ne pas déposer tel quel.

## 2026-06-29 23:16 — Claude Code (UX-2 nav Studio admin)
- **Fait (branche, EN PREVIEW — pas encore mergé) :** `feat/nav-studio-admin`.
  - Navbar : lien **« 🎛️ Studio »** → `/studio-decaissement`, affiché **uniquement pour les admins** (`user.role === "admin"`, dérivé de `ADMIN_EMAILS`). Desktop + mobile.
  - `App.tsx` : la route `/studio-decaissement` laisse passer l'admin **sans entitlement** (`isAdmin ? Studio : flux entitlement + SoftWall`). Pas touché `/analyse`. lint vert, build OK.
- **→ Pour Yuri/Cowork :** tester la Preview → dire « merge ».
- ⚠️ **Attention :** branche touche `App.tsx` + `Navbar.tsx` ; la branche #3 dashboard touche `Dashboard.tsx` + `Footer.tsx` → **disjointes**.

## 2026-06-29 (UX-2) — Cowork (demande de Yuri : Studio visible pour admin)
- **Contexte :** le Studio n'est pas dans la nav (pas public). Yuri veut y accéder **en tant qu'admin** pour travailler dessus.
- **→ Pour Claude Code (branche `feat/nav-studio-admin`, pas main, PAS `/analyse`) :**
  - Navbar : ajouter un lien **« Studio »** → `/studio-decaissement`, **affiché seulement si `user.role === "admin"`** (logique existante `src/api/base44Client.ts` / `ADMIN_EMAILS`).
  - `src/App.tsx` route `/studio-decaissement` : laisser passer l'admin **même sans entitlement** → `studioUnlocked || isAdmin` (garder le `SoftWall` pour les non-admins).
  - Affichage/garde seulement, pas de logique de calcul. Diff avant commit → Preview, pas de merge sans validation.
- ℹ️ `yuridufresne@gmail.com` = admin + a déjà l'entitlement → verra le Studio dès le merge.

## 2026-06-29 19:02 — Claude Code (#3 en-tête dashboard)
- **Fait (branche, EN PREVIEW — pas encore mergé) :** `feat/dashboard-header-cleanup`.
  - En-tête Dashboard : « Modifier l'ABF » = seule action primaire ; « Révoquer le partage », « Cookies marketing », « Réinitialiser… » déplacés dans le **menu ⚙️** (dropdown, clic dehors = ferme). Confirmations existantes conservées (confirm + ResetDataModal).
  - Footer : liens discrets **« Préférences cookies »** (rouvre la bannière) + **« Confidentialité »**.
  - Loi 25 : retrait du consentement reste **1 clic**. Affichage seulement, pas touché `/analyse`. lint vert, build OK.
- **→ Pour Yuri/Cowork :** tester la Preview → dire « merge ». (Les 3 tâches de la file Cowork sont alors toutes traitées.)
- ⚠️ **Attention :** branche touche `Dashboard.tsx` + `Footer.tsx` — si Cowork/Cursor y touche aussi, coordonner pour éviter un conflit.

## 2026-06-29 18:52 — Claude Code (merges Studio + disclaimer AMF)
- **Fait (mergé en prod) :**
  - **#7 Studio** `fix/studio-entitlement-serveur` mergé (`888bc0e`). SQL déjà en base (Cowork), pas relancé.
  - **#2 Disclaimer AMF** `feat/disclaimer-amf` mergé (`a092313`) : note « pas un conseil personnalisé » en bas de Dashboard / Résumé / Avancé / Immobilier / Protection. Pas sur `/analyse` ni pages publiques.
  - Conflit `App.tsx` (imports) résolu en gardant les deux features ; lint vert, build OK. Branches supprimées.
- **→ Pour les autres :** reste la **#3 en-tête dashboard** (`feat/dashboard-header-cleanup`) — pas encore commencée.
- ⚠️ **Attention :** `App.tsx` contient désormais l'entitlement Studio (RPC) **et** le wrapper `AvecDisclaimer` — en tenir compte pour la #3.

## 2026-06-29 18:36 — Claude Code (sécu / fiscal / qualité)
- **Fait (mergé en prod) :**
  - **Fix fiscal majeur** : crédit de conjoint *fantôme* (`calculateFullTax`, `conjointNetIncome=0` par défaut accordait le crédit à toute personne seule). Impôt sous-estimé ~4 577 $/an. Ex. 50 000 $ seul : retenue 525 → **~907 $/mois**. Flag `aConjoint` (défaut false). ⚠️ A fait **baisser revenus nets + NIF** affichés partout — c'est la **correction**, pas une régression.
  - Champ ABF « Impôt retenu / mois » : affiche l'estimation auto (retenue totale = impôt CAN/QC + RRQ/AE/RQAP), label gold « vide = estimé auto ».
  - Sécu : `/agent/debug` retiré ; clés Supabase en **env var** (+ `.env.example`) ; mot de passe **min 8 + lettres/chiffres** (client, aligné serveur) ; erreurs Supabase + `ErrorBoundary` → **Sentry**.
  - Garde-fous CI : **ESLint lint enfin tout le TS** (`src/lib` inclus) ; `npm run typecheck` réparé (non gaté, 2936 err strict pré-existantes).
  - Nettoyage : **12 fichiers morts** supprimés ; `calcNIF` appelait `buildPayload` 3× → 1× ; bug typo `capitalProjecte` (Dashboard ↔ moteur IQPF).
  - Meta Pixel (conforme au consentement).
- **En cours / branche :** `fix/studio-entitlement-serveur` (#7) — validée par Cowork, à merger. Ensuite : **disclaimer AMF** (item #2), puis **en-tête dashboard** (`feat/dashboard-header-cleanup`).
- ⚠️ **Attention :** `typecheck` strict = 2936 erreurs (surtout `any` implicite + lib UI non typée) → **non gaté en CI**, outil local ; déblocage = typer le retour de `buildPayload`.

## 2026-06-29 (UX) — Cowork (demande de Yuri : en-tête dashboard)
- **Contexte :** Yuri trouve « Révoquer le partage », « Cookies marketing » et « Réinitialiser » **trop visibles/accessibles**
  en boutons d'en-tête du dashboard (actions destructrices/privacy à côté de l'action principale).
- **→ Pour Claude Code (branche `feat/dashboard-header-cleanup`, pas main, PAS `/analyse`) :**
  - Garder **« Modifier l'ABF »** comme seule action primaire dans l'en-tête.
  - Déplacer dans le **menu ⚙️ existant** : « Révoquer le partage », « Réinitialiser » (les 2 avec **dialog de confirmation**) et « Cookies marketing ».
  - Liens discrets « Préférences cookies » + « Confidentialité » en **pied de page**.
  - Affichage/placement seulement, aucune logique/calcul. Diff avant commit → Preview, pas de merge sans validation.
- ⚠️ **Loi 25 :** retrait du consentement (partage, cookies) doit rester **facile = 1 clic** (menu ⚙️ + pied de page) — **ne pas enterrer**.

## 2026-06-29 (suite) — Cowork (validation Studio #7)
- **Fait :** testé la branche `fix/studio-entitlement-serveur` sur la Preview + RPC en prod (session authentifiée).
  - Bundle Preview : **plus de `STRATEGE2026` ni `studio_decaissement_unlocked`** ; appelle la RPC + table RLS.
  - Test RPC bout-en-bout : mauvais code → `false` (refusé) ; `STRATEGE2026` → `true` (entitlement créé) ; anonyme → 0 ligne.
- **→ Pour Claude Code :** **sécurité + fonctionnel VALIDÉS → OK pour `merge`** de la branche sur main.
- ⚠️ Le test a accordé l'entitlement Studio au compte `yuridufresne@gmail.com` (légitime ; supprimable si besoin d'un état vierge).

## 2026-06-29 — Cowork (sécu / conformité / Supabase)
- **Fait :**
  - Conformité Loi 25 : rédigé EFVP, Procédure+registre d'incidents, Politique de rétention (`conformite/`).
  - DPA **Supabase** (signé) + **Vercel** (auto-intégré) → PDF archivés dans `conformite/`.
  - Sécurité : **mot de passe min 6→8 + lettres/chiffres** réglé côté serveur Supabase.
  - **Vérifié le « pentest »** : RLS prouvée OK (test anonyme = 0 ligne), `/agent/debug` absent, password OK.
    Seul vrai trou = #7 premium client-side (`conformite/Verification-pentest-2026-06-29.md`).
  - **Correctif #7 — SQL appliqué en prod** : tables `studio_access_codes` + `studio_entitlement` (RLS),
    code `STRATEGE2026` migré en base, RPC `redeem_studio_code` (SECURITY DEFINER). **Vérifié OK.**
  - Backups : plan Supabase **gratuit = aucun backup auto** (consigné).
  - Ajouté la note **AMF** dans `CLAUDE.md` / `.cursorrules` (+ `conformite/NOTES-AMF-et-statut-conformite.md`).
- **→ Pour Claude Code :**
  1. **Studio #7** : commit/push la branche `fix/studio-entitlement-serveur` (le **SQL est déjà appliqué**, ne le relance pas) → Preview → test → merge si OK.
  2. **Disclaimer AMF** « pas un conseil personnalisé » sur toutes les pages d'analyse (branche → Preview, ne touche pas `/analyse`).
  3. Plus tard : bouton « Supprimer mon compte » + export JSON/CSV (droit à l'effacement Loi 25).
- **→ Pour Yuri (décisions $, avant lancement public) :** Supabase Pro (backups), Vercel Pro (usage commercial), évaluer migration région `ca-central-1`, faire relire les docs conformité.
- ⚠️ **Attention :** le SQL du Studio est **déjà en base** — Claude Code ne doit PAS ré-exécuter la migration.
