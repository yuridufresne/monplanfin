# 🚀 Checklist de pré-déploiement — MonPlanFin

**But :** ce qui reste pour être **opérationnel**, **conforme légalement** et **juste dans les
estimations** avant d'ouvrir à de vrais clients. Document vivant — cocher au fur et à mesure.

*Établi le 2026-07-01 (Claude Code), à partir de `conformite/Audit-securite-conformite-2026-06-30.md`,
`conformite/NOTES-AMF-et-statut-conformite.md` et du journal. Sources qui font foi = ces fichiers.*

**Légende :** ☐ à faire · ✅ fait · 👤 = action **Yuri** (paiement/juridique) · 💻 = action **code (Claude Code)**
· ⚖️ = **avocat/AMF**. Sévérité : 🔴 bloquant lancement · 🟡 souhaitable.

---

## 1. 🖥️ Opérationnel

- ✅ Déploiement Vercel auto + CI gate (lint/typecheck/tests/build).
- ✅ Auth Google + templates emails brandés (Cowork).
- ✅ [L4] Données de test (profil « Marcil ») nettoyées en prod (Cowork, 2026-07-01).
- ✅ Verrou multi-agents « un seul agent à la fois » (`scripts/agent-lock.sh`).
- ☐ 🔴 👤 **Vercel Hobby → Pro.** Le plan gratuit est « usage **non commercial** » (ToS) et le DPA Vercel
  vise Pro/Enterprise. Requis pour opérer commercialement + couverture contractuelle. (~20 $/mois)
- ☐ 🔴 👤 **Backups Supabase [L2].** Plan gratuit = **aucun backup auto** → corruption/erreur = perte
  **irréversible** des dossiers clients. Passer à un plan payant avant de stocker de vrais dossiers.
- ☐ 🟡 💻/👤 **Protéger `main` sur GitHub** (merge seulement si CI verte) → supprime les push directs
  accidentels en prod + rend le gate réellement bloquant.

## 2. ⚖️ Conforme légalement

**Socle solide** : hors régime AMF (outil éducatif, aucun produit vendu, aucun conseil perso), wording
conforme (vérifié : pas de « Membre AMF », pas de titre réservé auto-attribué, disclaimers présents),
Loi 25 avancée (DPA Supabase+Vercel signés, consentement par finalité, effacement + export, EFVP,
rétention, incidents, section mineurs <14).

- ✅ Wording AMF corrigé (plus de « du cabinet » / « Planification financière » / « accrédités AMF »).
- ✅ [L3] « Supprimer mon compte » + export JSON/CSV (RPC `delete_my_account`, Cowork).
- ✅ [S1] `REVOKE anon` appliqué en prod (Cowork). [S2] CSP `script-src` durci, validé en prod.
- ✅ **Véracité des partenaires** — inscription au **registre AMF vérifiée** (Yuri, 2026-07-03).
  Discipline continue : re-vérifier à chaque nouvel agent (trace : date + n° d'inscription).
- ✅ **Rémunération du référencement — réglé PAR CONCEPTION** (Yuri, 2026-07-03) : **aucun paiement
  par référence, aucun partage de commission**. Les agents (groupe restreint) gardent 100 % de leurs
  commissions et **cofinancent le site** (frais fixes) pour les leads → le risque LDPSF (partage de
  commissions avec non-inscrit) est écarté structurellement. *(Relecture avocat des ententes agents =
  bonne pratique, plus un bloquant.)*
- ☐ 🟡 ⚖️ **Relire les 3 docs Loi 25** (EFVP, incidents+registre, rétention — brouillons) par conseiller RP/avocat.
- ✅ **[L1] Hébergement de la BD au Canada** — vérifié 2026-07-02 (`supabase projects list`, Claude Code) : le projet est DÉJÀ en `ca-central-1` (Montréal). Nuance : des sous-traitants traitent encore des données hors Canada (CDN Vercel, Resend us-east-1 pour les courriels) → l'EFVP reste pertinente et conservée.

## 3. 📊 Juste dans les estimations

**Socle solide** : constantes 2026 vérifiées exactes (PSV 740,09 · MGA 74 600 · paliers · abattement QC
16,5 % · clawback PSV) ; bug du crédit de conjoint fantôme corrigé ; couche calcul verrouillée par le gate typecheck.

- ✅ [C1] Impôt forfaitaire décaissement 18 % → **20 %** + (i) explicatif (2026-07-01).
- ✅ Bug **NaN des prestations** corrigé (ACE/famille/solidarité/REEE dans SimulateurImpot — `fiscalQC` → `rfnr`).
- ✅ [C3] Formule SRG + [C4] clamp des négatifs.
- ✅ [C2] Gate typecheck bloquant, étendu à toute la couche calcul (`lib`/`utils`/`api`/`hooks` + composants sûrs).
- ✅ **Bug « impôt retenu jeté »** — corrigé par Cowork (2026-07-01, racine dans `useABFSync` §1b :
  repli sur l'estimation `calcNetPersonne`, conjoint inclus).
- ☐ 🟡 💻 **Calculatrices natives** (`audit-calculatrices-2026-06`) : bugs/constantes de la page Calculators à revoir.
- ☐ 🟡 👤 **Passe de validation** : relire quelques cas types (SimulateurImpot : ACE/famille/solidarité)
  avec un fiscaliste pour confirmer que les montants « sonnent juste ».

---

## 🎯 Chemin le plus court vers « prêt au lancement »

**MUST (bloquant — il n'en reste qu'UN) :**
1. 👤 **Vercel Pro + backups Supabase** (opérationnel + Loi 25). C'est le dernier bloquant de lancement.
2. ~~Vérifier l'inscription AMF des partenaires~~ ✅ fait (2026-07-03).
3. ~~Valider la rémunération du référencement~~ ✅ réglé par conception : aucun partage de commission (2026-07-03).

**SHOULD (code, je peux les faire) :**
4. 💻 Revalider les calculatrices natives (corrections SCHL/IQPF de Cowork — passe fiscaliste/Yuri).
   *(« Impôt retenu jeté » : ✅ corrigé par Cowork le 2026-07-01, `useABFSync`.)*
5. 💻/👤 Protéger `main`.

**Répartition :** 1 = Yuri (paiements) · 4-5 = Claude Code (code).
