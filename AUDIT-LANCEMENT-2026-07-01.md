# 🚦 Audit de lancement — MonPlanFin — 2026-07-01

**Réalisé par :** Cowork (audit complet : code, prod live, Supabase, Vercel, CI, conformité).
**Référence :** `PRE-DEPLOIEMENT.md` · `conformite/Audit-securite-conformite-2026-06-30.md` · `JOURNAL-AGENTS.md`.

## Verdict

**Techniquement : PRÊT.** Code, CI, prod, sécurité, RBAC et wording AMF sont en état de lancement.
**Commercialement : PAS ENCORE.** 4 bloquants restants, tous côté Yuri (paiement/juridique), zéro côté code.

---

## ✅ Vérifié VERT (constaté en direct ce jour)

| Axe | Constat |
|---|---|
| CI GitHub | 101 runs sur `main`, **tous verts**, incluant le HEAD déployé (`11a9a4c`) |
| Gate typecheck | `npm run typecheck:lib` = **0 erreur** (exécuté localement) |
| Lint | `eslint --quiet` = **0** (exécuté localement) |
| Prod à jour | Vercel : dernier déploiement = `docs: passation` (`11a9a4c`) = HEAD de `main` |
| Console navigateur | **0 erreur** (CSP incluse) sur `/`, `/calculatrices`, `/education`, `/methodologie`, `/contact`, `/protection` |
| Headers sécu (vercel.json) | CSP stricte sans `unsafe-inline` script, HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy |
| SEO | title/description/canonical/OG/fr_CA + `robots.txt` + `sitemap.xml` (7 URLs) |
| Wording AMF | Pages publiques + `/protection` conformes : disclaimers présents, « outil éducatif », pas de titre réservé auto-attribué, term4sale retiré |
| Supabase | Projet **Healthy** · hook `public.custom_access_token_hook` **ENABLED** · RBAC confirmé bout-en-bout (agent Andrew) |
| Fonctionnel | Calculatrices calculent en direct ; flux dossier → `/admin/dossiers` → assignation opérationnel |

*Note : jest/vite ne tournent pas dans le sandbox Cowork (binaires macOS vs Linux) → tests/build validés via la CI GitHub (verte).*

---

## 🔴 BLOQUANTS lancement (4 — tous côté Yuri, aucun code)

1. **Backups Supabase [L2]** — constaté live : plan **FREE**, « **No backups** ». Une corruption = perte irréversible des dossiers clients. → Passer au plan Pro (~25 $ US/mois) AVANT de stocker de vrais dossiers.
2. **Vercel Hobby → Pro** — constaté live : team **Hobby**. ToS = usage non commercial ; le DPA signé vise Pro/Enterprise. (~20 $ US/mois)
3. **Véracité du claim footer** « Tous nos conseillers partenaires sont accrédités par l'AMF » — vérifier l'inscription réelle de chaque partenaire au registre AMF (incl. Andrew), ou masquer le claim tant que non prouvé.
4. **Rémunération du référencement** — à valider avocat/AMF AVANT de monétiser (partage de commissions = réservé aux inscrits ; peut faire basculer le statut « hors régime »).

## 🟡 À corriger rapidement (code, mineurs — je peux les faire)

5. **`Home.tsx:127`** : « un conseiller **accrédité AMF** prend le relais » — reste du wording d'avant le fix (l'AMF *inscrit*, n'*accrédite* pas). → « conseiller partenaire inscrit à l'AMF ».
6. **`index.html` (meta description + og:description)** : « un plan **révisé par un conseiller encadré par l'AMF** » — promet que chaque plan est révisé par un conseiller. Véracité à confirmer, sinon reformuler (« avec possibilité de relais vers un conseiller partenaire inscrit à l'AMF »).
7. **`/protection`** : le palier du milieu s'intitule « LE STANDARD **RECOMMANDÉ** » — dernier reste d'endossement (le badge a été corrigé en « Selon vos réponses », pas le titre du palier).
8. **Donnée test en prod** : dossier « **DUFY** » (yuridufresne@, très urgent, assigné Andrew) dans `/admin/dossiers` — à supprimer avant lancement (même logique que Marcil [L4]).
9. **Bug « impôt retenu jeté »** (`calcRevenuNet` → `FeuilleResume`, affiche 0 si champ vide) — chiffre montré au client (déjà au PRE-DEPLOIEMENT).
10. **Calculatrices natives** — bugs/constantes de `audit-calculatrices-2026-06` à repasser (déjà au PRE-DEPLOIEMENT).

## 🟡 Juridique / process (non bloquant technique)

11. **Conditions §5** : le consentement au partage avec les partenaires est intégré à l'acceptation des CGU (« En créant un compte… vous consentez à ce que vos renseignements soient partagés »). Loi 25 privilégie un consentement **distinct** pour la communication à des tiers — le ConsentGate avec case explicite existe déjà côté app, mais faire trancher la formulation des CGU par l'avocat (relecture Loi 25 déjà prévue).
12. **Relire les 3 docs Loi 25** (`conformite/`) par avocat/RP.
13. **Protéger `main`** sur GitHub (merge seulement si CI verte).
14. **[L1] Hébergement hors Canada** — EFVP faite ; migration vers `ca-central-1` optionnelle.

---

## 🎯 Chemin critique vers le lancement

**Jour J-x (Yuri, ~45 $/mois + 2 vérifs) :** Supabase Pro (backups) → Vercel Pro → vérifier registre AMF des partenaires → avocat (référencement + CGU §5 + docs Loi 25).
**Code (30 min, n'importe quel agent) :** items 5-6-7-8 (wording Home + meta, titre palier Protection, purge dossier DUFY).
**Ensuite :** items 9-10 (bugs de calcul 🟡) peuvent suivre dans la première semaine post-lancement si assumés.
