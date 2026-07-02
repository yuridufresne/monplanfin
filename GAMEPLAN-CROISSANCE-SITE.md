# 🚀 Gameplan croissance — modifications site & code

**Contexte :** plan d'optimisation du tunnel et du trafic (deck partenaires, slide « Optimisation du tunnel »).
Budget associé : ligne courriel ~28 $/mois ajoutée au classeur (total An 1 = 19 720 $).
**Rédigé le 2026-07-01 (Cowork).** Exécution : Claude Code / Cursor (code) · Cowork (configs externes) · Yuri (décisions).

**Garde-fous transverses (s'appliquent à CHAQUE item) :**
- ⚖️ AMF : jamais « planificateur/conseiller financier », aucun conseil personnalisé, ton éducatif, disclaimers conservés.
- 🇫🇷 **Loi 101 (Charte de la langue française) — RÈGLE INVIOLABLE : le français PRIME sur toute communication.**
  Courriels, notifications, PDF, pages, pubs : rédigés en français d'abord ; si une autre langue est offerte un jour,
  le français reste au moins équivalent et affiché en premier. Aucune comm client unilingue anglaise, jamais.
- 🎨 **Marque — RÈGLE INVIOLABLE : toute communication qui part vers un client porte le logo (icône `public/favicon.svg`)
  + le wordmark « MonPlanFin » (« Mon » + « PlanFin » vert).** Courriels (modèle = templates Auth déjà brandés),
  PDF (portrait NIF, exports), notifications, documents. Aucune comm « nue ».
- 🔒 `/analyse` (ABF 11 étapes) est FIGÉ — aucun item ci-dessous ne modifie le wizard. On optimise AUTOUR.
- 📋 Loi 25/LCAP : tout courriel de relance = fondé sur le consentement d'inscription + lien de désabonnement dans chaque envoi.
- 🧪 Tout code neuf = gate-clean (typecheck 0), verrou agent, entrée journal.

---

## P0 — Tableau de bord KPI dans l'espace admin (S1, ~2 jours) — demande Yuri 2026-07-01
**Quoi :** une page `/admin/kpi` (onglet « KPI » à côté de Dossiers/Équipe) qui donne les outils de contrôle
ET alimente le rapport mensuel promis aux partenaires (FAQ investisseurs Q6). Métriques :

| Bloc | Métriques |
|---|---|
| **Comptes** | Total comptes créés · nouveaux ce mois · courbe par mois (12 mois) |
| **Entonnoir** | ABF commencées · ABF complétées (11/11 sections) · taux de complétion · dossiers soumis · taux de soumission |
| **Dossiers** | Par statut (nouveau/vu/contacté/en cours/converti/perdu) · par agent · délai moyen d'attribution · **taux de conversion par agent** |
| **Abonnés** | Nb d'entitlements Studio actifs (source : entitlement serveur #7) · dont via parrainage (P4) |
| **Bassin secondaire** | Comptes SANS dossier soumis (la cible des relances P2) · dont relancés/désabonnés (`email_log`, après P2) |
| **Coûts (saisie manuelle)** | Dépense pub du mois (champ admin) → CPL calculé = dépense ÷ dossiers soumis · coût/client = dépense ÷ convertis |
| **Attribution (CMO)** | Comptes et dossiers par `utm_source/medium/campaign` (capture en P1b) → CPL et CAC PAR CANAL |
| **Abandon ABF (CMO)** | Répartition des profils par dernière section complétée → identifier L'ÉTAPE où ça décroche |
| **Boucle agents (CMO)** | À la fermeture d'un dossier : produit/valeur approximative (converti) ou **motif de perte** (injoignable/pas prêt/déjà servi/mauvais fit) · **speed-to-lead** = délai attribution → 1er contact, par agent |
| **Persona (CMO)** | Profil AGRÉGÉ des convertis vs perdus (tranches d'âge, région, tranche de revenu, besoin principal) — jamais de lignes individuelles (Loi 25) → réinjecté dans le ciblage pub |
| **Portes d'entrée (CMO)** | Inscriptions par page d'origine (quelle calculatrice convertit) → priorise le chantier SEO P5 |

- **Backend :** vues SQL agrégées `admin_kpi_*` (ou RPC `get_admin_kpi()`) **security definer + check `is_admin()`** —
  ne JAMAIS exposer de lignes individuelles, seulement des agrégats. Compter les comptes via `financial_profile`
  (distinct user) ou une vue sur `auth.users` réservée à l'admin.
- **Frontend :** `src/pages/AdminKpi.tsx` (hors gate au début, même modèle qu'AdminDossiers), cartes + petits
  graphiques (recharts déjà dans le repo). Bouton « Exporter le mois (CSV) » pour le rapport partenaires.
- ⚠️ Comparer les chiffres affichés aux hypothèses du deck (8 % inscription, 50 % complétion, 75 % soumission,
  20 % conversion) : c'est l'outil de recalibration trimestrielle.
**Livrable :** page KPI admin + export CSV mensuel.

## P1 — Retargeting des abandonneurs (S1, ~½ jour)
**Quoi :** exploiter le Meta Pixel (déjà consenti/gaté) pour recibler ceux qui ont commencé sans soumettre.
- Code : émettre des événements GÉNÉRIQUES au niveau des routes (`analytics.ts`) : `abf_started`, `abf_completed`, `dossier_submitted`. **Aucune donnée financière dans les événements** (Loi 25) — juste le jalon.
  - ⚠️ Ne pas instrumenter dans `src/components/abf/**` (territoire figé) → hook au niveau de `App.tsx`/route ou du service de persistance des sections.
- Config (Cowork/Yuri, hors code) : audiences personnalisées Meta « started sans submitted », campagne « Terminez votre portrait — 5 minutes ».
**Livrable :** 3 événements + 1 audience + 1 campagne.

## P1b — Capture d'attribution UTM (S1, ~½ jour) — **À FAIRE AVANT DE DÉPENSER LA PUB**
**Quoi :** sans UTM, les 16 500 $ de pub ne produisent aucun apprentissage (impossible de savoir quel canal performe).
- Code : au premier chargement, lire `utm_source/medium/campaign` (+ referrer + page d'entrée), persister
  (localStorage → colonne sur le compte à l'inscription), et **recopier sur le `lead_dossier` à la soumission**.
- Toutes les URL de pub/posts utilisent des UTM normalisés (convention : `meta/cpc/<campagne>`, `google/cpc/<campagne>`, `agent/<code>`).
**Livrable :** chaque compte et chaque dossier porte son canal d'origine → alimente le bloc Attribution du P0.

## P2 — Infrastructure courriel + séquences (S1-S2, ~2-3 jours)
**Quoi :** le site n'envoie AUCUN courriel applicatif aujourd'hui (constat d'audit). Prérequis de tout le nurture.
- Choisir le fournisseur : **Resend** (API simple, ~20 US$/mois, budgété) ou Mailchimp si Yuri veut l'éditeur visuel.
- DNS (Cowork, côté WHC/cPanel — hors périmètre code) : SPF/DKIM/DMARC pour l'envoi depuis `@monplanfin.ca`.
- Code :
  1. **Accusé de soumission de dossier** (item déjà ouvert au journal du 2026-07-01) — courriel au client + notification à l'admin.
  2. **Séquence de relance ABF** : job planifié (Supabase Edge Function + cron / pg_cron) sur les comptes `financial_profile` incomplets sans `lead_dossier` : J+1 (« votre progression est sauvegardée »), J+3 (« aperçu de ce qui vous attend »), J+7 (dernière relance). Table `email_log` (idempotence + preuve de consentement/désabonnement).
  3. **Désabonnement 1 clic** (obligatoire LCAP) + champ `email_optout` respecté partout.
  4. **Chaque courriel = gabarit brandé** (logo + wordmark, français — règles inviolables ci-dessus) + métriques
     ouvertures/clics/désabonnements par séquence remontées au bloc « Bassin » du P0 (le taux de désabo = canari LCAP).
**Livrable :** envoi transactionnel opérationnel + 3 relances automatiques + accusé de soumission.

## P3 — Lead magnet « Mon portrait NIF » (S2, ~2 jours)
**Quoi :** un PDF/page-résumé partiel généré dès que les sections revenus+épargne existent — SANS toucher au wizard.
- Points d'accroche autorisés : bandeau sur le **Dashboard** (« Téléchargez votre portrait partiel ») et **lien dans le courriel J+3** (P2). Pas d'insertion dans `/analyse` sauf décision explicite de Yuri.
- Code : réutiliser les moteurs SSOT (`buildPayload`, `calcNIF`) → rendu HTML imprimable ou react-pdf. Disclaimer AMF sur le document.
**Livrable :** portrait partiel téléchargeable + CTA « complétez pour la version complète ».

## P4 — Parrainage (S2-S3, ~1-2 jours)
**Quoi :** lien référent `monplanfin.ca/?ref=<code>` ; récompense = **accès Studio temporaire** (logiciel — pas de rémunération de référencement).
- **Barème (décision Yuri 2026-07-01) — récompense à l'INSCRIPTION RÉUSSIE, jamais à l'envoi :**
  - 1 ami inscrit (compte + courriel vérifié + 1re étape ABF commencée) → **1 mois de Studio** ;
  - 3 amis inscrits → **1 an de Studio** ; plafond de cumul : 2 ans.
  - Anti-abus : validation courriel obligatoire, l'étape ABF élimine les inscriptions fantômes, garde-fou même IP/domaines jetables.
- **⚠️ LCAP : AUCUN envoi de courriel par la plateforme aux personnes invitées.** Le mécanisme = lien personnel que l'utilisateur partage lui-même (texto/Messenger/courriel perso). Pas de champ « entrez les adresses de vos amis ».
- Code : capture du `ref` à l'inscription (colonne sur le profil), compteur, attribution de l'entitlement Studio (l'infrastructure d'entitlement serveur existe déjà — item #7 de juin).
- UI : petite section « Invitez un proche » au Dashboard (lien + bouton copier + décompte vers la prochaine récompense).
**Livrable :** lien de parrainage fonctionnel + récompense automatique au barème ci-dessus.

## P5 — SEO / pré-rendu (T2, ~1 semaine — le plus gros chantier)
**Quoi :** la SPA n'expose qu'un `index.html` : les pages publiques n'ont ni title/meta/H1 propres ni schema → quasi invisibles en organique.
- Étape 1 : `react-helmet-async` → title/meta/canonical par route publique (`/calculatrices`, `/education`, `/methodologie`, `/contact`, etc.).
- Étape 2 : pré-rendu des 7 routes publiques au build (vite-plugin-prerender ou équivalent) pour servir du HTML complet aux crawlers. Vérifier compatibilité avec la CSP et Vercel.
- Étape 3 : schema.org `FAQPage` sur les calculatrices, pages « guide » longues (« Comment calculer son impôt au Québec en 2026 », etc.), extension du sitemap. Contenu structuré = aussi mieux repris par les IA génératives.
- ⚠️ Wording AMF sur chaque nouvelle page guide.
**Livrable :** pages publiques indexables + 3-5 guides initiaux.

## ~~P6 — Webinaires~~ — ❌ RETIRÉ (décision Yuri 2026-07-01)
Non retenu pour l'An 1. Ne pas développer.

---

## Prérequis toujours ouverts (avant tout le reste)
1. **Supabase Pro** (backups) + **Vercel Pro** — bloquants lancement, budgétés.
2. **CGU §5 / consentement** : le bassin secondaire (relance des comptes sans dossier) repose sur ce consentement → relecture juridique recommandée même sans mandat d'avocat au budget.
3. Push des commits en attente + protection de `main` (checklist PRE-DEPLOIEMENT).

## Ordre d'exécution (validé par Yuri 2026-07-01)
S1 : **P0 (KPI admin) + P1b (UTM — avant toute dépense pub)** + P1 → S2 : P2 + P3 → S3-S4 : P4 (barème ci-dessus) → T2 : P5. (P6 retiré.)
Chaque item = branche + preview + entrée `JOURNAL-AGENTS.md` (protocole habituel).
