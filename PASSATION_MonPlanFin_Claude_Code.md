# MonPlanFin — Document de passation pour Claude Code

> **But de ce document** : permettre à un agent (Claude Code) de reprendre le travail à froid.
> Il décrit le site, l'architecture des calculs, l'audit complet des incohérences, ce qui a
> déjà été corrigé, ce qui reste à faire, et **la règle directrice : aucun doublon de calcul.**

---

## 0. Règle directrice (la plus importante)

**Un même chiffre ne doit être calculé qu'à UN seul endroit (Single Source of Truth).**

Le problème de fond de l'app : les mêmes quantités (revenu net, RRQ/PSV, valeur nette,
total des comptes, dépenses, RFNR…) sont **recalculées indépendamment dans plusieurs
fichiers**, avec des clés de comptes différentes, des constantes différentes (ex. PSV
740 $ vs 713 $) et des formules différentes. Résultat : deux écrans affichent deux chiffres
différents pour la même chose.

La consigne du propriétaire (Yuri, conseiller financier au Québec) est sans ambiguïté :

> « Je ne veux plus de source différente si je calcule la même chose à deux endroits différents. »
> « Pourquoi on ne prend pas juste la même source d'info que le dashboard pour calculer RRQ,
> PSV et pension, et on ne fait pas que les brancher ? Je ne veux plus de doublon. »

**Méthode attendue** : choisir LE moteur canonique pour chaque quantité, puis *brancher*
tous les consommateurs dessus (les autres calculs sont supprimés, pas dupliqués).

---

## 1. Description du site

**MonPlanFin** est une application de planification financière construite sur **Base44**
(constructeur d'app IA), synchronisée sur **GitHub** (Claude Code édite donc directement le
dépôt). Public : un conseiller financier québécois et ses clients.

**Stack** : React, recharts, framer-motion, lucide-react.

**Concepts métier clés :**
- **NIF — Numéro d'Indépendance Financière** : capital à accumuler pour atteindre
  l'indépendance financière à la retraite. Affiché en dollars futurs nominaux ET en dollars
  d'aujourd'hui.
- **ABF — Analyse de Besoins Financiers** : assistant (wizard) multi-étapes qui collecte le
  profil, les revenus, la retraite, les comptes/épargne, les dettes, le budget, les protections.
- **Revenus garantis de retraite** : RRQ (Régime de rentes du Québec), PSV/SV (Sécurité de la
  vieillesse), SRG (Supplément de revenu garanti), pension d'employeur (PD).
- **Feuille de résumé** et **budget** : doivent concorder au dollar près avec le dashboard.

**Pages / composants principaux :**
- `src/pages/Dashboard.jsx` — dashboard client (carte NIF, carte « Revenus garantis »,
  protection, valeur nette, placements & épargne, allocations).
- `src/pages/FinancialAnalysis.jsx` — **le wizard ABF** (~1880 lignes). Contient les champs de
  saisie : emplois (revenu_brut, impot_saisi, autres_retenues), retraite (RRQ mode
  estimer/spécifier, PSV, fond de pension), comptes, dettes typées, etc.
- `src/pages/FeuilleResume.jsx` — feuille de résumé.
- `src/components/abf/StepBudget.jsx` — étape budget **réellement vue par l'utilisateur**
  (≠ BudgetGrid).
- `src/components/abf/PortraitLive.jsx` — portrait financier en direct.
- `src/components/abf/InsightsABF.jsx` — encadrés d'analyse.
- `src/components/abf/StepAllocations.jsx` — allocations familiales.
- `src/components/budget/BudgetGrid.jsx` — grille budgétaire détaillée (pas l'écran par défaut).

**Entités (base de données Base44)** : BetaFeedback, BudgetEntry, ContactMessage, Debt,
EducationProgress, FinancialGoal, FinancialProfile, Investment, LeadDossier, UserConsent.
(RLS « propriétaire » déjà appliqué sur les entités sensibles.)

---

## 2. Architecture des calculs (les moteurs)

Tous dans `src/lib/`.

| Fichier | Fonction principale | Rôle | Statut SSOT |
|---|---|---|---|
| `clientPayload.js` | `buildPayload(profiles)` | **SOURCE UNIQUE DE VÉRITÉ.** NIF, capital, revenus garantis (RRQ/PSV/pension/SRG, constantes 2026 correctes), épargne. | ✅ Canonique |
| `calcRevenuNet.js` | `calcRevenuDisponible(profiles)` | Revenu net / impôt → `{ revenuNetMensuel, allocMensuel, totalMensuel, rfnrFamilial }`. Aussi `calcEpargne(profiles)` + `COMPTES_EPARGNE`. | ✅ Canonique (revenu net, épargne) |
| `calcNIF.js` | `calcNIFFromProfiles(profiles)` | Orchestrateur NIF. **Lit désormais `buildPayload` pour les revenus garantis.** | ✅ Branché sur buildPayload |
| `moteurFiscal2026.js` | `calculateFullTax` | Moteur fiscal (impôt fédéral/QC, cotisations). | Référence fiscale |
| `allocations2026.js` | `calcAllocations` | Allocations familiales. | Référence allocations |
| `prestationsGouvernementales.js` | `getRevenusGarantisABF`, `calcRRQ/PSV/SRG`, `PRESTATIONS_2026` | **Ancien second moteur RRQ/PSV — constantes PÉRIMÉES (PSV 713,34 au lieu de 740,09).** En cours de retrait. | ⚠️ À retirer |
| `abf.js` | `readEpargne`, `calcCibleRetraite` | **Doublon** de readEpargne avec clés fantômes. | ⚠️ À rebrancher |
| `selecteurs.js` | sélecteurs partagés | Créé (CORR-1). | ✅ |
| `dettes.js` | tri avalanche | Bug de départage (P6). | ⚠️ Bug |

### Clés de comptes (CRITIQUE)

**Clés correctes** (telles que l'ABF les sauvegarde) :
```
reer, celi, celiapp, reee, cri_lira, compte_non_enregistre, crypto, ftq_csn
```
**Clés fantômes** (utilisées par du vieux code bogué — elles ne pointent sur rien) :
```
cri, frv, non_enregistre
```
Tout code lisant `comptes.cri`, `comptes.frv` ou `comptes.non_enregistre` **laisse tomber
silencieusement** ces comptes (CRI/LIRA, FTQ/CSN, non-enregistré, crypto) du NIF et de la
valeur nette. Source de vérité du jeu de comptes de retraite :
`COMPTES_EPARGNE` dans `calcRevenuNet.js` =
`["reer","celi","celiapp","cri_lira","ftq_csn","compte_non_enregistre","crypto"]`
(REEE exclu : épargne-études, pas capital de retraite).

### Fond de pension (DB vs DC) — piège de double comptage
- **Prestations déterminées (DB)** : champs `prestation_mensuelle` / `rente_mensuelle_estimee`
  → c'est un **revenu garanti** (ne pas compter comme capital).
- **Cotisations déterminées (DC)** : champs `solde` / `cotisation_salariale` /
  `cotisation_patronale` → c'est du **capital** (ne pas compter comme revenu).
- Règle adoptée : « selon les champs remplis ». Si une prestation DB > 0 → revenu seulement ;
  sinon solde DC → capital seulement. Déjà implémenté dans `clientPayload.js` et `calcNIF.js`.

---

## 3. L'audit complet (incohérences trouvées)

### A. Comptes épargne / clés fantômes
`clientPayload`, `calcNIF`, `Dashboard` lisaient `cri/frv/non_enregistre` alors que l'ABF
sauvegarde `cri_lira/ftq_csn/compte_non_enregistre/crypto` → comptes disparus du NIF et de la
valeur nette.
- ✅ **Corrigé** dans `clientPayload.js`, `calcNIF.js`, `Dashboard.jsx`.
- ✅ **CORR-2 fait** : `abf.js`, `InsightsABF.jsx`, `AdvancedMode.jsx`, `PortraitLive.jsx`
  rebranchés ; clés fantômes résiduelles du `Dashboard.jsx` (frv, criCot, frvCot) et le
  passthrough `comptes` de `clientPayload.js` (cri/frv) nettoyés. `PlacementStrategie.jsx` et
  `BudgetGrid.jsx` utilisaient déjà les bonnes clés (lecture par compte sur buildPayload /
  per-account prefill) → aucun changement requis.

### B. Revenu net recalculé en parallèle
Recalculé indépendamment (approximations de taux) dans PortraitLive, FeuilleResume, StepBudget,
InsightsABF.
- ✅ **Corrigé** : tous branchés sur `calcRevenuDisponible(profiles).revenuNetMensuel`.

### C. RRQ / PSV / pension — DEUX moteurs (le doublon de la capture d'écran)
- Carte NIF (gauche) lisait `buildPayload` → PSV 740,09 $/mois (correct 2026).
- Carte « Revenus garantis » (droite) lisait `getRevenusGarantisABF` → PSV 713,34 $/mois (périmé),
  RRQ légèrement différent. D'où **RRQ 18 092 vs 18 096** et **SV 8 881 vs PSV 8 556** sur le
  MÊME dashboard.
- ✅ **Corrigé aujourd'hui** : `calcNIFFromProfiles` lit maintenant le bloc
  `buildPayload(...).revenus_garantis` (un seul moteur). Le patch « estimer » temporaire de la
  veille a été retiré (buildPayload gère le mode estimer nativement via `calculRRQ`).
- ✅ **CORR-99 finalisé** : `calcNIF.js` nettoyé — suppression du bloc mort `svA/rrqA/svB/rrqB`
  (qui portait l'ancien `PSV_MENSUEL` 713,34), de la constante `PSV_MENSUEL`, et des imports
  morts `getRevenusGarantisABF`, `calculRRQ`, `PRESTATIONS_2026`. calcNIF lit uniquement
  `buildPayload(...).revenus_garantis`.
- ✅ **Constantes alignées** dans `prestationsGouvernementales.js` (directive #7) :
  `psv.mensuel65` 713,34 → **740,09** ; `rrq.renteMax65` 1364,60 → **1507,65** (= 18 091,80 $/an).
  Corrige les écrans encore branchés sur l'ancien moteur (AssistantPrestations, SimulateurRetraite
  via `retraite.js`, `decaissementQC`).
- ⚠️ **Reste (optionnel)** : `getRevenusGarantisABF` n'a plus aucun consommateur (code mort) —
  peut être supprimé de `prestationsGouvernementales.js`. Plus dangereux maintenant que les
  constantes sont à jour.

### D. RFNR (revenu familial net rajusté) — pour les allocations
Recalculé dans StepAllocations (estimation à plat `brut × 0,70`) et FeuilleResume (`p1.imposable + p2.imposable`).
- ✅ **CORR-3 fait** : `calcRevenuDisponible` expose maintenant `rfnrP1`/`rfnrP2` (par personne)
  en plus de `rfnrFamilial`. `StepAllocations.jsx` lit `rfnrP1`/`rfnrP2` du moteur (fin du
  `× 0,70`) ; `FeuilleResume.jsx` lit `rfnrFamilial`. Un seul RFNR dans toute l'app.
- ⚠️ **Note** : `calcRevenuDisponible` calcule le revenu/RFNR à partir des **emplois** seulement
  (les *sidehustles* ne sont pas comptés, et REER déduit = 0). C'est cohérent partout, mais si
  Yuri veut inclure les sidehustles dans le RFNR, il faudra le faire dans `calcRevenuNet.js`
  (impacte aussi le revenu net affiché sur tous les écrans).

### E. Valeur nette — portrait ≠ résumé
PortraitLive et FeuilleResume calculaient la valeur nette différemment (REEE in/out,
fonds d'urgence in/out, hypothèques).
- ✅ **CORR-4 fait** : `calcValeurNette(profiles, { investmentsTotal, debtsTotal })` créé dans
  `calcRevenuNet.js`. Définition unique — ACTIFS : comptes (7 + REEE) + fond de pension (solde)
  + immobilier (valeur marchande, sinon prix d'achat, sinon solde) + fonds d'urgence + placements ;
  PASSIFS : dettes + hypothèques (either/or immobilier→dettes, jamais concaténées). `PortraitLive`
  branché entièrement ; `FeuilleResume` branché (placements et dettes-avec-repli-entité passés en
  paramètres) + **ligne fonds d'urgence ajoutée aux actifs** (elle était omise de la valeur nette).
- ⚠️ **Note** : `Dashboard.jsx` et `FinancialPlan.jsx` calculent encore leur propre `netWorth`
  (et Dashboard **concatène** les hypothèques immobilier+dettes au lieu de either/or). À unifier
  sur `calcValeurNette` lors de CORR-6 si on veut l'alignement complet dashboard/feuille/portrait.

### F. Dépenses budget — 3 surfaces divergentes
StepBudget, BudgetGrid, FeuilleResume calculent les dépenses différemment ; l'hypothèque
n'était pas prise en compte.
- ✅ Hypothèque injectée comme dépense dans StepBudget (auto-calcul du paiement à partir de
  solde/taux/amortissement si `paiement_mensuel` vide).
- ✅ **CORR-5 fait** : `calcDepensesMensuelles(budgetEntries, profiles)` + `toMensuel` créés dans
  `calcRevenuNet.js`. Définition unique : dépenses de vie (budget, hors impôts retenus à la
  source et hors lignes « (ABF) ») + service de la dette (hypothèques + prêts) depuis les
  sections ABF (hypothèque auto-calculée si `paiement_mensuel` vide, comme StepBudget).
  `Dashboard.jsx` et `FeuilleResume.jsx` branchés → mêmes dépenses des deux côtés. **Le cashflow
  du dashboard inclut maintenant le service de la dette** (l'hypothèque y était absente — P3).
- ⚠️ **Note** : `StepBudget`/`BudgetGrid` ne sont pas branchés (ce sont les *éditeurs* qui
  produisent les BudgetEntry ; leur total = somme des lignes éditables + hypothèque injectée).
  Les lignes de service de dette saisies manuellement dans le budget doivent rester taguées
  « (ABF) » (sinon double comptage avec le service de dette ABF — cf. P8).

### G. Immobilier (décision métier prise)
- La **dette hypothécaire** va dans le **passif**.
- La **valeur de la maison** va dans l'**actif** et **s'apprécie** au taux **inflation + 1 %
  = 3,3 %** (avec `INFLATION = 2,3 %`), conformément à l'IQPF.
- ✅ Appliqué.

---

## 4. Plan de correction (CORR) — état

| # | Tâche | Statut |
|---|---|---|
| CORR-1 | Sélecteurs partagés (`calcEpargne`, `COMPTES_EPARGNE`, etc.) | ✅ Fait |
| CORR-2 | Comptes épargne : rebrancher `abf.js`, `InsightsABF`, `AdvancedMode`, `PortraitLive` sur `calcEpargne`/`COMPTES_EPARGNE` + nettoyer clés fantômes Dashboard/clientPayload. (`PlacementStrategie`/`BudgetGrid` déjà OK.) `calcEpargne` enrichi avec fond de pension DC. | ✅ Fait (à confirmer en preview) |
| CORR-3 | RFNR unique : brancher StepAllocations + FeuilleResume sur `rfnrFamilial`/`rfnrP1`/`rfnrP2` | ✅ Fait (à confirmer en preview) |
| CORR-4 | Valeur nette unique : `calcValeurNette`, brancher PortraitLive + FeuilleResume | ✅ Fait (à confirmer en preview) |
| CORR-5 | Dépenses budget : un seul moteur (`calcDepensesMensuelles`), Dashboard + FeuilleResume branchés | ✅ Fait (à confirmer en preview) |
| CORR-6 | Vérification preview (NIF, net, allocations, valeur nette, dépenses) + publication du lot | ⬜ À faire |
| CORR-99 | Revenus garantis source unique (RRQ/PSV/pension) | ✅ Fait (à confirmer en preview) |

**Lot non publié en attente de vérification** (≈ fichiers déjà modifiés et sauvegardés) :
`clientPayload.js`, `calcNIF.js`, `Dashboard.jsx`, `calcRevenuNet.js`, `FinancialAnalysis.jsx`,
`FeuilleResume.jsx`, `PortraitLive.jsx`, `InsightsABF.jsx`, `StepBudget.jsx`, `BudgetGrid.jsx`,
`abf.js`, `AdvancedMode.jsx` (CORR-2).

**CORR-2 — détail des changements (cette session) :**
- `calcRevenuNet.js` : `calcEpargne` inclut désormais le fond de pension **DC** (capital), via
  `_fondPensionDC` (même règle DB/DC que `clientPayload`). Devient le SSOT capital complet
  (7 comptes hors REEE + fond pension DC), foyer + par personne + `parCompte`.
- `PortraitLive.jsx` / `InsightsABF.jsx` : `epargne`/`solde`/`cotM` lus depuis
  `calcEpargne([{section:"retraite", data: retraite}])` ; suppression des `COMPTE_KEYS` locaux
  (qui incluaient REEE) et du code mort `tauxEffectifApprox`.
- `AdvancedMode.jsx` : `sumEpargne`/`sumCotis` (qui faisaient `Object.values` → incluaient REEE
  et le fond pension sans règle DB/DC) remplacés par `calcEpargne(profiles)`.
- `abf.js` (module mort, non importé) : `readEpargne` lit `cri_lira` au lieu de `cri`, expose
  `soldeRetraite`/`cotRetraite` sur les 7 bonnes clés ; champ fantôme `soldeFrv` retiré.
- `Dashboard.jsx` : `frvSolde`/`frvCot` (fantômes) retirés, `criCot` lit `cri_lira` ;
  `totalCotMensuelle` inclut maintenant ftq_csn/crypto/compte_non_enregistre ; le **total de la
  carte** « Placements & épargne » utilise `comptesSoldeTotal` (incluait avant ni FTQ ni crypto
  ni non-enregistré alors que leurs lignes s'affichaient) ; ligne CRI renommée « CRI / LIRA ».
- `clientPayload.js` : passthrough `comptes` corrigé (retrait `cri`/`frv`, ajout
  celiapp/cri_lira/ftq_csn/compte_non_enregistre/crypto) ; `soldeCri` lit `cri_lira` ;
  `soldeFrv` (fantôme, non consommé) retiré. `comptes_a`/`comptes_b` ne sont consommés nulle part.

---

## 5. Bugs « Peterson » (feedback bêta-testeur) — état

| # | Bug | Statut |
|---|---|---|
| P1 | Marge de crédit supprimée réapparaît. ✅ Cause trouvée : `syncABFToEntities` (useABFSync.js) créait les `Debt` sans jamais les mettre à jour ni supprimer → dette retirée de l'ABF persistait + ressuscitée par le fallback entité. Corrigé : réconciliation create/update/delete, dettes ABF marquées `source:"abf"` (les dettes manuelles ne sont jamais touchées). Note : un fantôme **créé avant ce correctif** (sans marqueur) peut nécessiter une suppression manuelle une fois. | ✅ Fait (valider profil test) |
| P2 | Épargne REER 250→0 stale. ✅ Cause trouvée : l'ABF sauvegardait `FinancialProfile` sans invalider le cache react-query `["financialProfiles"]` (toutes les autres entités le font). Corrigé : `invalidateQueries(["financialProfiles"])` après save (autosave + saveStep) dans FinancialAnalysis. | ✅ Fait (valider profil test) |
| P3 | Hypothèque absente partout (actif/dette/budget/cashflow) | ✅ Fait |
| P4 | Feuille de résumé incohérente | ⏳ (couvert en partie par CORR-3/4/5) |
| P5 | Actifs totaux = 0 (valeur nette) | ✅ Fait |
| P6 | Avalanche : départage à taux égal. ✅ Fait — `b.taux - a.taux \|\| (a.solde - b.solde)` (et snowball : `a.solde - b.solde \|\| b.taux - a.taux`) dans `src/lib/dettes.js` | ✅ Fait |
| P7 | Revenus : chômage + études + retraite dans le moteur net (`calcRevenuDisponible` route par `statut_principal` ; AE & retraite imposables, bourses non imposables). Paie de vacances : clarifiée comme incluse dans le revenu brut (indice UI, pas de champ en plus → simple, zéro double comptage). | ✅ Fait |
| P8 | Doublon paiement auto (Dette vs Budget) | ✅ Fait |
| P9 | Impôts : confusion théorique (~13/14k) vs retenu saisi (~10/12k). ✅ Fait — `calcRevenuDisponible` expose `impotSaisiFamilial` ; la carte « Impôts totaux (théorique) » de FeuilleResume affiche en sous-titre l'impôt retenu + le solde à payer / remboursement estimé. Pas de toggle (simple), les 2 valeurs visibles. | ✅ Fait |

---

## 6. Contraintes permanentes (à respecter absolument)

1. **Montrer tous les changements (diff) avant de publier.** Ne jamais publier sans validation.
2. **Ne modifier aucun texte légal de fond sans accord** (mentions, confidentialité, consentement).
3. **SSOT** : un seul calcul par quantité ; brancher, ne pas dupliquer.
4. **Jamais** saisir d'identifiants ni de données de paiement. (Une fenêtre de facturation
   Base44 peut apparaître — la fermer sans rien saisir.)
5. **Pas de marque Primerica** ni de noms de marque dans l'app.
6. **Vérifier de bout en bout** : après chaque correction, chercher si le même bug se reproduit
   ailleurs, et confirmer le résultat dans le preview.
7. Constantes officielles **2026** (déjà dans `clientPayload.js`) : PSV 740,09 $/mois ;
   RRQ max 18 091,80 $/an ; MGA 74 600 $. Toute autre valeur (ex. 713,34) est périmée.

---

## 7. Prochaines étapes recommandées (ordre)

1. **Confirmer CORR-99 en preview** : sur le dashboard d'un profil en mode RRQ « estimer »,
   vérifier que la carte NIF (gauche) et la carte « Revenus garantis » (droite) affichent les
   mêmes RRQ/PSV/pension.
2. **CORR-2** : rebrancher les 5 fichiers de sommation de comptes sur `calcEpargne`.
3. **CORR-3 / CORR-4 / CORR-5** : RFNR, valeur nette, dépenses — un moteur chacun.
4. **Nettoyer `prestationsGouvernementales.js`** : retirer `getRevenusGarantisABF` (ou aligner
   ses constantes) et l'import inutilisé dans `calcNIF.js`.
5. **P6** (tri avalanche), puis P7 / P9.
6. **CORR-6** : vérification globale en preview, présenter les diffs, publier le lot.

### Méthode de vérification SSOT
Pour chaque quantité, faire `grep` du nom (ex. `rrq`, `valeurNette`, `rfnr`, `revenuNet`,
`soldeTotal`) dans tout `src/` : s'il existe plus d'un endroit qui la **calcule** (et non
qui la **lit**), c'est un doublon à éliminer.

---

# ANNEXE — Diffs exacts déjà appliqués

> Convention : `–` = retiré, `+` = ajouté. Les blocs marqués **[exact]** sont le code réel
> appliqué cette session ; les blocs marqués **[reconstruit]** décrivent fidèlement le
> changement appliqué lors du lot précédent (vérifier le code actuel avant de t'appuyer dessus).
> Tous les fichiers ci-dessous ont été **sauvegardés** dans Base44 mais **PAS publiés**.

---

## A1 — `src/lib/clientPayload.js`

### A1.1 Export de la formule RRQ partagée **[exact]**
```diff
- function calculRRQ({ salaireMoyen, anneesCotisation, ageDebut }) {
+ export function calculRRQ({ salaireMoyen, anneesCotisation, ageDebut }) {
```
Raison : rendre la formule RRQ réutilisable (SSOT) au lieu de la dupliquer.

### A1.2 `readEpargne` lit la section `retraite` complète (DB/DC) **[reconstruit]**
```diff
- function readEpargne(comptes = {}) {
-   // soldeReer/soldeCeli/soldeCri(frv)… (clés fantômes, fond de pension non géré)
+ function readEpargne(ret = {}) {
+   const comptes = ret.comptes || {};
+   const fp = ret.fond_pension || {};
+   const fpEstDB = (parseFloat(fp.prestation_mensuelle ?? fp.rente_mensuelle_estimee ?? 0) || 0) > 0;
+   const fpSolde = fpEstDB ? 0 : (parseFloat(fp.solde) || 0);
+   const fpCot   = fpEstDB ? 0 : ((parseFloat(fp.cotisation_salariale)||0) + (parseFloat(fp.cotisation_patronale)||0));
+   // soldeRetraite / cotRetraite = reduce sur les 7 clés correctes + fpSolde / fpCot
+ }
```
Et au site d'appel : `readEpargne(ret.comptes)` → `readEpargne(ret)`.
Projection capital : `capA = fv(pA.soldeRetraite, pA.cotRetraite, REND_ACCUM_EFF, nA)` (idem B).

### A1.3 Bloc `revenus_garantis` (déjà correct — sert de source canonique)
Expose (annuel) : `rrq_foyer, sv_foyer, pension_foyer, srg_foyer, total, total_futur,
rrq_a, sv_a, pension_a, srg_a, sous_total_a, rrq_b, sv_b, pension_b, srg_b, sous_total_b,
*_idx`. Constantes 2026 : `PSV_MENSUEL 740.09`, `RRQ_MAX_65 18091.80`, `MGA_2026 74600`.

---

## A2 — `src/lib/calcNIF.js`

### A2.1 Clés de comptes corrigées **[reconstruit]**
```diff
- const COMPTES_RETRAITE = ["reer","celi","cri","frv","non_enregistre"];   // clés fantômes
+ const COMPTES_RETRAITE = ["reer","celi","celiapp","cri_lira","ftq_csn","compte_non_enregistre","crypto"];
```
Et fond de pension conditionnel (ne compter le solde DC que si pas de prestation DB) :
```diff
+ const _fpDB = (parseFloat(_fpE.prestation_mensuelle ?? _fpE.rente_mensuelle_estimee ?? 0) || 0) > 0;
+ if (!_fpDB) total += /* solde / cotisations DC */;
```

### A2.2 CORR-99 — Revenus garantis lus depuis `buildPayload` (élimination du doublon) **[exact]**
Import :
```diff
- import { buildPayload, nifMoyenne } from '@/lib/clientPayload';
+ import { buildPayload, nifMoyenne, calculRRQ } from '@/lib/clientPayload';
```
> Note : `calculRRQ` n'est plus utilisé dans la version finale (l'adaptateur lit buildPayload) —
> import désormais inutile, peut être retiré. De même, l'import `getRevenusGarantisABF` est
> devenu inutilisé dans ce fichier.

Remplacement du calcul (≈ lignes 224–244). **Retiré** : le commentaire « source unique :
getRevenusGarantisABF », le bloc temporaire `_rrqBaseEstimee` (patch estimer de la veille),
et l'appel `getRevenusGarantisABF(_retraiteRRQ, _retraiteCRRQ, inclureConj, ageActuel, ageConjoint)`.
**Ajouté** :
```js
  // -- Revenus garantis : SOURCE UNIQUE = buildPayload (clientPayload, chiffres 2026)
  // Meme decomposition RRQ/PSV/pension que la carte NIF -> aucun doublon de moteur.
  const _payG = buildPayload(profiles);
  const _G = (_payG && _payG.revenus_garantis) || {};
  const revenusGarantis = {
    p1: { rrq: (_G.rrq_a || 0) / 12, psv: (_G.sv_a || 0) / 12, pension: (_G.pension_a || 0) / 12 },
    p2: { rrq: (_G.rrq_b || 0) / 12, psv: (_G.sv_b || 0) / 12, pension: (_G.pension_b || 0) / 12 },
    totalAnnuel: (_G.rrq_foyer || 0) + (_G.sv_foyer || 0) + (_G.pension_foyer || 0),
    decomposition: {
      rrqFoyer:     _G.rrq_foyer || 0,
      psvFoyer:     _G.sv_foyer || 0,
      pensionFoyer: _G.pension_foyer || 0,
    },
  };
```
Les consommateurs en aval restent inchangés :
```js
  const rrqMensuelTotal = revenusGarantis.p1.rrq + revenusGarantis.p2.rrq;
  const psvMensuelTotal = revenusGarantis.p1.psv + revenusGarantis.p2.psv;
  const fpMensuelTotal  = revenusGarantis.p1.pension + revenusGarantis.p2.pension;
  const revGarantiAnnuelAuj = revenusGarantis.totalAnnuel;
  // … calcNIF({ revenuGarantiAujourdhui: revGarantiAnnuelAuj,
  //             decompositionGarantis: revenusGarantis.decomposition, … })
```
> ⚠️ `totalAnnuel` exclut volontairement le SRG (pour reproduire l'ancien comportement de
> `getRevenusGarantisABF`). Si on veut inclure le SRG, utiliser `_G.total`.

---

## A3 — `src/lib/calcRevenuNet.js` (CORR-1)

### A3.1 Sélecteurs d'épargne partagés (ajout) **[reconstruit]**
```js
export const COMPTES_EPARGNE = ["reer","celi","celiapp","cri_lira","ftq_csn","compte_non_enregistre","crypto"];
function _sumComptesField(comptes, field) { /* somme field sur les 7 clés */ }
export function calcEpargne(profiles) {
  // → { soldeFoyer, cotFoyer, soldeA, soldeB, cotA, cotB, parCompte }
}
```
### A3.2 Retenues + RFNR
- Déduction `autres_retenues` (annualisée par emploi, retP1/retP2) soustraite du net.
- `rfnrFamilial` exposé dans l'objet retourné par `calcRevenuDisponible`.

---

## A4 — `src/pages/Dashboard.jsx`

### A4.1 Agrégation des soldes (clés corrigées + comptes ajoutés) **[reconstruit]**
```diff
- const criSolde = sum(comptes.cri);
+ const criSolde          = sum(comptes.cri_lira);
+ const ftqSolde          = sum(comptes.ftq_csn);
+ const cryptoSolde       = sum(comptes.crypto);
+ const compteNonEnrSolde = sum(comptes.compte_non_enregistre);
- const totalAssets = … ;
+ const totalAssets = … + ftqSolde + cryptoSolde + compteNonEnrSolde;
```
### A4.2 Lignes de carte « Placements & épargne » (ajout après CELIAPP)
```jsx
{ftqSolde > 0 && <Row left="FTQ / CSN" right={fmt(ftqSolde)} dot="#E0625C" />}
{cryptoSolde > 0 && <Row left="Crypto" right={fmt(cryptoSolde)} dot="…" />}
{compteNonEnrSolde > 0 && <Row left="Non enregistré" right={fmt(compteNonEnrSolde)} dot="…" />}
```
> Rappel architecture : `rrqMensuelTotal`/`psvMensuelTotal`/`fpMensuelTotal` viennent de
> `calcNIFFromProfiles` (donc, après CORR-99, de buildPayload). La carte NIF de gauche lit
> `buildPayload` directement. Les deux concordent désormais.

---

## A5 — `src/pages/FeuilleResume.jsx`
```diff
+ import { calcRevenuDisponible } from '@/lib/calcRevenuNet';
+ const _dispoReel = calcRevenuDisponible(profiles);
+ const revenuNetMensuel = _dispoReel.revenuNetMensuel;
+ const revenuNetTotal   = revenuNetMensuel * 12;
```
- Filtre `depensesVie` : exclut les libellés `(ABF)` ET `/Imp[oô]ts? \(retenues/`.
- `serviceDetteABF` : hypothèque (section immobilier) + dettes.
- Le moteur fiscal théorique détaillé (`calcImpotPaliers`/`calcCotisations`) est **conservé
  volontairement** (vue détaillée), mais le cashflow réel utilise `calcRevenuDisponible`.

---

## A6 — `src/components/abf/PortraitLive.jsx`
```diff
+ import { calcRevenuDisponible } from '@/lib/calcRevenuNet';
- const netMensuel = /* tauxEffectifApprox … */;
+ const netMensuel = calcRevenuDisponible([
+   { section: "revenu",   data: revenu },
+   { section: "retraite", data: retraite },
+ ]).revenuNetMensuel;
  // valeurNette = epargne + immoValeur + fondsUrgence − dettesTotal  (sources ABF)
```

---

## A7 — `src/components/abf/InsightsABF.jsx`
```diff
+ import { calcRevenuDisponible } from '@/lib/calcRevenuNet';
- const netM = /* approximation */;
+ const netM = calcRevenuDisponible([
+   { section: "revenu",   data: S.revenu   || {} },
+   { section: "retraite", data: S.retraite || {} },
+ ]).revenuNetMensuel;
```
> Reste : la somme des cotisations via `COMPTE_KEYS` (≈ ligne 111) n'est pas encore rebranchée
> sur `calcEpargne` → à faire dans CORR-2.

---

## A8 — `src/components/abf/StepBudget.jsx`
```diff
+ const abfDepenses = useMemo(() => {
+   // injecte l'hypothèque (sections.immobilier.hypotheques) comme dépense
+   // paiement auto-calculé depuis solde/taux/amortissement_restant si paiement_mensuel vide
+   // chaque ligne taguée source:"abf"
+ }, [sections]);
- const depenses = entries.filter(e => e.type === "depense");
+ const depenses = [...entries.filter(e => e.type === "depense"), ...abfDepenses];
```
> C'est **StepBudget** (et non BudgetGrid) que l'utilisateur voit réellement.

---

## A9 — `src/pages/FinancialAnalysis.jsx` (wizard ABF)
- Composant `Select` + constante `DEBT_TYPES_ABF` ; chaque ligne de dette a un champ `nom`
  et un menu déroulant de type.
- Champ **« Autres retenues sur la paie »** par emploi : `autres_retenues` +
  `autres_retenues_freq` (placeholder « ex : syndicat, régime de retraite, vacances » ;
  l'aide exclut pension alimentaire / FTQ-CSN).
- **27 placeholders** préfixés « ex : » + style `placeholder:italic placeholder:text-white/40`
  (pour distinguer une suggestion système d'une vraie saisie).
- Ligne ~770 : `{ key: "cri_lira", label: "CRI / LIRA (Ancien fonds de pension)" }`.
- Bloc RRQ (`PrestationsBlock`) : mode `rrq_mode` = `estimer` (défaut) | `specifier`.
  - estimer → `salaire_moyen_carriere`, `annees_cotisation_rrq`, `age_debut_rrq`.
  - specifier → `rrq` (rente mensuelle à 65 ans).

---

## A10 — `src/components/budget/BudgetGrid.jsx`
- Lignes de dette dynamiques (`debtRows`), une par dette, libellées par `nom`,
  section « 9. Dettes et remboursements ».
- Préremplissage hypothèque depuis la section immobilier.
- La sauvegarde exclut les lignes `abfReadOnly`.
> Note : BudgetGrid n'est pas l'écran budget par défaut (c'est StepBudget). Encore à rebrancher
> sur `calcEpargne` / moteur de dépenses unique (CORR-2 / CORR-5).

---

## Récapitulatif des fichiers touchés (lot non publié)
`clientPayload.js`, `calcNIF.js`, `calcRevenuNet.js`, `Dashboard.jsx`, `FeuilleResume.jsx`,
`PortraitLive.jsx`, `InsightsABF.jsx`, `StepBudget.jsx`, `FinancialAnalysis.jsx`,
`BudgetGrid.jsx`.

**Avant publication** : afficher les diffs, vérifier en preview que NIF (gauche) = Revenus
garantis (droite), que revenu net / valeur nette / dépenses concordent entre dashboard,
portrait et feuille de résumé.
