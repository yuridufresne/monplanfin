# Passation — Refonte ABF + Audit Assurance (à publier)

> Destinataire : Claude Cowork / prochaine session. État : **tout en working tree, RIEN poussé/commité.**
> Branche `main`, HEAD `5dd662e`. Lint + `vite build` = **EXIT 0** sur l'ensemble.
> Règle d'or tenue tout du long : **aucun nouveau moteur de calcul** — on ne fait que *brancher* sur les moteurs existants (SSOT). Les formules JS du prototype `abf-intake.html` n'ont **pas** été portées.

---

## 0. TL;DR — quoi publier

Deux chantiers indépendants, tous deux prêts :

1. **Refonte de la prise de données ABF** → nouveau parcours 11 étapes sur la route **`/analyse2`** (coexiste avec l'ancien `/analyse`, qui est **intact**). + une fondation de câblage (résolveur de sections) qui touche 9 fichiers existants mais **sans changement de comportement** (no-op prouvé).
2. **Audit + ajustements du calculateur d'assurance vie** (`/protection`) : meilleure couverture, retrait des prix, revenu net fiscal réel.

→ Voir §6 « Comment publier » à la fin.

---

## 1. Inventaire des fichiers

### Nouveaux (17)
```
src/lib/sectionsRetraite.js                      ← résolveur de sections (cœur du câblage ABF)
src/pages/AnalyseABF.jsx                         ← le nouveau wizard (route /analyse2)
src/components/abf/wizard/abfWizardModel.js      ← PHASES/STEPS/phaseOf/toProfiles/aConjoint (helpers PURS)
src/components/abf/wizard/PortraitBandeau.jsx    ← bandeau portrait horizontal live
src/components/abf/wizard/steps/primitives.jsx   ← inputs thème clair + accessibilité
src/components/abf/wizard/steps/StepProfil.jsx
src/components/abf/wizard/steps/StepRevenu.jsx
src/components/abf/wizard/steps/StepAllocations.jsx
src/components/abf/wizard/steps/StepEpargne.jsx
src/components/abf/wizard/steps/StepDettes.jsx
src/components/abf/wizard/steps/StepImmobilier.jsx
src/components/abf/wizard/steps/StepAssurance.jsx
src/components/abf/wizard/steps/StepEtudes.jsx
src/components/abf/wizard/steps/StepBudget.jsx
src/components/abf/wizard/steps/StepObjectifs.jsx
src/components/abf/wizard/steps/StepUrgence.jsx
```

### Modifiés (14)
```
index.html                          ← lang="en" → "fr-CA"
src/App.jsx                         ← +1 route /analyse2 (additif, aucune route existante touchée)
src/lib/sectionsRetraite.js (nouveau, voir ci-dessus)
src/lib/clientPayload.js            ← buildPayload : dict.retraite → resoudreRetraite(dict) (×2)
src/lib/calcNIF.js                  ← m.retraite → resoudreRetraite(m)
src/lib/calcRevenuNet.js            ← calcEpargne/calcValeurNette → lireRetraite ; + export paiementHypoMensuel
src/lib/decaissementSimple.js       ← shiftRetraite décale aussi la section "objectifs"
src/lib/immobilierPayload.js        ← bySection.retraite → resoudreRetraite(bySection)
src/components/abf/PortraitLive.jsx ← idem (1 ligne)
src/components/abf/InsightsABF.jsx  ← idem (2 endroits)
src/pages/Dashboard.jsx             ← idem (1 ligne)
src/pages/FeuilleResume.jsx         ← idem (1 ligne)
src/lib/moteurProtection.js         ← audit assurance (voir §4)
src/lib/protectionPayload.js        ← commentaire (rename frais)
src/pages/ProtectionAssurance.jsx   ← retrait affichage des primes + titre couple
```

> NB : `src/pages/FinancialAnalysis.jsx` (l'ANCIEN wizard ABF) **n'a pas été touché** (diff vide).

---

## 2. Câblage ABF — la pièce maîtresse (`sectionsRetraite.js`)

**Le problème résolu :** avant, une seule section de stockage `retraite` portait les comptes d'épargne, le fond de pension ET les rentes garanties (RRQ/PSV/âge/cible). Le nouveau parcours **éclate** ça :
- étape Épargne → section **`epargne`** (comptes)
- étape Objectifs → section **`objectifs`** (RRQ/PSV/âge/cible + pension DB)
- étape Études → section **`etudes`** (REEE)

Or ~9 lecteurs (buildPayload, calcNIF, calcEpargne, calcValeurNette, PortraitLive, InsightsABF, FeuilleResume, Dashboard, immobilierPayload) lisaient la forme historique `retraite`. **Sans correctif, le NIF / la valeur nette / les garantis s'effondraient à 0.**

**La solution : `resoudreRetraite(dict)`** — pure tuyauterie (zéro arithmétique). Reconstruit l'objet `retraite` historique à partir des nouvelles sections, avec **court-circuit no-op** : tant qu'`epargne`/`objectifs`/`etudes` n'existent pas, il retourne `dict.retraite` **par référence identique** → comportement strictement inchangé pour tous les profils existants.

Fusion : `comptes` ← epargne · rrq/age/cible ← objectifs (prioritaire) · `fond_pension` = pension DB (objectifs) · REEE ← etudes · conjoint inclus.

**Validé (tests dans `scratchpad/`, exécutés via loader d'alias Node) :**
- Profil legacy ≡ profil éclaté → **8/8 sorties moteur identiques** (buildPayload entier, calcNIF, calcEpargne, calcValeurNette, calcRevenuDisponible).
- No-op legacy confirmé (retourne la même référence).

---

## 3. Le nouveau parcours ABF (`/analyse2`)

11 étapes / 3 phases (bornes = prototype : P1 = ét.1 · P2 = ét.2-9 · P3 = ét.10-11).

| # | Étape | Section écrite | Branché sur (moteur existant) |
|---|---|---|---|
| 1 | Profil | `profil_personnel` | — (pilote cohérence conjoint + nb enfants) |
| 2 | Revenu | `revenu` | `calcRevenuDisponible` (impôt vide ⇒ moteur fiscal) |
| 3 | Allocations | `allocations` | `calcAllocations` (ACE + AF QC) |
| 4 | Épargne | **`epargne`** | `calcEpargne` (clés exactes) |
| 5 | Dettes | `dettes` | `calcValeurNette` / `dettes.js` |
| 6 | Immobilier | `immobilier.hypotheques[]` | `calcValeurNette` + `paiementHypoMensuel` |
| 7 | Assurance | `assurance.polices[]` | agrégation simple (mensualisation) |
| 8 | Études | **`etudes.comptes.reee[]`** | valeur nette via résolveur |
| 9 | Budget | `budget.entries[]` | `calcRevenuDisponible` + `calcDepensesMensuelles` |
| 10 | Objectifs | **`objectifs`** | `buildPayload` → NIF (RRQ via `calculRRQ`, PSV via `calculPSV`) |
| 11 | Urgence | `fonds_urgence` | `revenuNetMensuel` (hors allocation) |

**Clés de comptes Épargne (CRITIQUE, ne pas casser)** : `reer, celi, celiapp, cri_lira, compte_non_enregistre, ftq_csn, crypto`. Le **régime employeur DC (RPA/RVER)** est routé vers `cri_lira` (capital immobilisé) — PAS vers `fond_pension` (réservé à la pension DB des Objectifs), sinon la règle either/or supprime le solde DC (bug C6, déjà attrapé+corrigé).

**Chrome** : logo MonPlanFin, barre 3 phases, chips cliquables, nav haut+bas synchro (Suivant→Terminer), scroll-to-card, bandeau portrait horizontal collant (net + « incl. allocation X $ », brut, épargne, immobilier, dettes, barre %), thème clair/sombre (toggle, `localStorage abf-theme`, **sombre par défaut**), écran final + Soumettre.

**Persistance** : autosave debounce 1.5 s vers `FinancialProfile` (pattern repris de `FinancialAnalysis`) + hydratation au montage depuis les sections de l'utilisateur. ⚠️ **À tester en environnement Base44 connecté** (auth + entités). Best-effort (try/catch) : si hors-ligne, reste en mémoire.

**Garde-fous anti double-comptage tenus (validés bout-en-bout) :**
- C4 hypothèque+dettes injectées par le moteur (pas dans `entries`) — pas de double.
- C5 REEE compté **une seule fois** (source = Études) et **exclu** du capital retraite.
- C6 pension DB (revenu) vs capital DC (épargne) — séparés, pas de double.
- C2 fonds d'urgence = net **hors** allocation ; cashflow = net **avec** allocation.

### 3bis. Passe de polish UI (croisée avec `abf-intake-changements-ui.md`)
Dernier lot, déjà inclus dans les fichiers ci-dessus (lint+build OK) :
- **`index.html`** : `lang="fr-CA"`.
- **Thème** : toggle soleil/lune, **sombre par défaut**, persistance `localStorage` (`abf-theme`) — `AnalyseABF.jsx`.
- **Bandeau portrait** : mention « **+ incl. allocation X $** » sous le revenu net — `PortraitBandeau.jsx`.
- **Accessibilité** (`primitives.jsx`) : association `label↔champ` (`htmlFor`/`id` auto via `useId`) sur **tous** les inputs ; `aria-required` / `aria-invalid` / `aria-describedby` ; messages d'erreur `role="alert"` (tél/courriel via `error` dans `StepProfil`) ; anneau de focus clavier (`focus-visible:ring`).
- **Budget** (`StepBudget.jsx`) : **sous-postes suggérés** en puces par catégorie (12) ; **donut interactif** — survol croisé segment↔légende + centre dynamique (poste · montant · %).
- **Objectifs** (`StepObjectifs.jsx`) : **estimateur** repliable (profil de carrière Élevés/Moyens/Modestes + années au Canada) → **préremplit** `salaire_moyen_carriere` + `sv_residence_prevue`/`annees_residence_canada`, puis RRQ/PSV **calculés par les moteurs existants** (`calculRRQ`/`calculPSV`) — aucune formule du proto portée.
- Sélecteurs de fréquence stylés au thème (pas de `<select>` blanc natif).
- Reste « partiel » assumé : redesign visuel « thème clair premium » (fonds teintés multi-couches) — fonctionnel + dégradés en place, pas un relook complet.

---

## 4. Chantier Assurance (`/protection`)

Audit actuariel + ajustements (lint+build OK) :
- `moteurProtection.js` : plafond du besoin « Optimale » `10× net` → **`12× brut`** (ne sous-assure plus les jeunes) ; **`netDe(brut)`** branché sur le moteur fiscal QC réel (remplace le `×0,72` à plat) ; libellé « Frais funéraires » → « **Frais de dernier recours** ».
- `ProtectionAssurance.jsx` : **retrait de tout l'affichage des primes** ($/mois) — la page montre maintenant le **capital de couverture requis** seulement (décision de Yuri : pas de prix sur le site) ; titre mode couple « couverture combinée » → « total assuré · chaque conjoint séparément ».
- Les tables de primes ont été recalibrées puis **annulées** (restaurées) puisque les prix ne sont plus affichés — le moteur les calcule encore mais elles ne sont plus montrées.

---

## 5. Ce qui RESTE (optionnel, non bloquant)

- **Bascule `/analyse` → nouveau wizard** : aujourd'hui les deux coexistent. Quand `/analyse2` est validé, pointer la route `/analyse` vers `AnalyseABF` (ou rediriger). Décision de Yuri.
- Persistance entité à **valider en live** (Base44 connecté).
- Split épargne/dettes par titulaire (tout en foyer A pour l'instant — totaux corrects, attribution par personne approximative).
- Override manuel du « montant d'allocation cashflow » (le moteur calcule auto ; demanderait ~1 ligne dans `calcRevenuDisponible`).
- Bouton « Soumettre » = stub (les données sont déjà autosauvegardées).
- Mode conseiller sur `/analyse2` (self-mode pour l'instant).
- Polish visuel « thème clair premium » (fonds teintés multi-couches, phases qui rayonnent) — fonctionnel + dégradés en place, mais pas un redesign complet.

---

## 6. Comment publier (push online)

1. **Revoir les diffs** (contrainte permanente : ne jamais publier sans validation). Les 14 fichiers modifiés sont listés au §1 ; les changements sur les 9 lecteurs existants sont **1 ligne chacun** (source de données → résolveur), no-op prouvé.
2. **Vérifier en preview** : la route `/analyse2` n'a **pas besoin du backend** pour le rendu (état mémoire) → testable sans auth. Pour la persistance, tester connecté.
3. **Sanity dashboard** : ouvrir un profil EXISTANT et confirmer que NIF / valeur nette / revenus garantis / feuille de résumé sont **identiques** à avant (le résolveur est no-op tant qu'aucune nouvelle section n'existe). C'est la garantie que rien n'est cassé.
4. **Publier** via le flux Base44/GitHub habituel (Base44 édite le dépôt). `git status` est propre côté nouveaux fichiers ; aucun commit/push n'a été fait par l'agent.
5. Le fichier `PASSATION_MonPlanFin_Claude_Code.md` (présent, non suivi) est l'ANCIENNE passation — celle-ci la complète pour le volet ABF.

**Risque si on saute l'étape 3 :** aucun connu — le no-op est prouvé par test (8/8) et `vite build` passe. Le seul vrai point d'attention est la **persistance entité du nouveau wizard** (à confirmer en live).

---

## 7. Tests reproductibles (dans `scratchpad/`, non versionnés)

- `alias-loader.mjs` — loader Node qui résout l'alias `@/` → `src/` hors-ligne.
- `test-phase0.mjs` — équivalence legacy ≡ sections éclatées (8/8).
- `test-epargne.mjs` — les clés de comptes Épargne remontent au moteur (REEE exclu, RPA→cri_lira).
- `test-e2e.mjs` — dossier complet 11 sections → tous les moteurs + garde-fous C4/C5/C6.
Exécution : `node --experimental-loader ./alias-loader.mjs <test>.mjs`.
