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
