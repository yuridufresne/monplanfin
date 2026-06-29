# Politique de conservation et de destruction des renseignements personnels
## MonPlanFin — Loi 25 / LPRPDE

> **Statut : BROUILLON à valider.** La Loi 25 exige de **détruire ou anonymiser** les renseignements
> personnels une fois la **finalité accomplie**, et d'avoir des **durées de conservation** définies.
> ⚠️ À faire relire par un conseiller/avocat. Niveau « bêta ».

| Champ | Valeur |
|---|---|
| Responsable (RPRP) | Emmanuel Dufresne — confidentialite@monplanfin.ca |
| Version | 0.1 (brouillon) · Date : _(à dater)_ |

---

## 1. Principe
On ne conserve un renseignement personnel **que le temps nécessaire** à la finalité pour laquelle il a
été recueilli. Passé ce délai, il est **détruit** ou **anonymisé** de façon sécuritaire.

## 2. Durées de conservation

| Catégorie de données | Durée de conservation | Déclencheur de destruction |
|---|---|---|
| **Compte usager** (courriel, profil, authentification) | Tant que le compte est **actif** | Suppression du compte, ou **24 mois d'inactivité** |
| **Données financières d'analyse** (revenus, dettes, épargne, objectifs) | Durée du compte actif ; archivage limité si requis | Suppression du compte / fin de la finalité |
| **Données d'usage / analytics** | **≤ 24 mois** | Purge périodique |
| **Preuve de consentement** (UserConsent, horodatée) | Conservée tant que le traitement a lieu **+ délai de prescription** | Après destruction des données liées |
| **Registre des incidents** | **≥ 5 ans** après clôture de l'incident | — |

> Note : une règle « financière = 7 ans » s'applique surtout aux **dossiers de représentation/transaction
> réglementés (AMF)**. MonPlanFin étant un **outil éducatif** (pas un dossier client réglementé), la
> conservation est calée sur la **finalité** + l'inactivité. À confirmer selon ton statut AMF réel.

## 3. Modalités de destruction sécuritaire
- **Suppression logique puis physique** des enregistrements dans Supabase (DELETE + purge des sauvegardes
  selon le cycle du fournisseur).
- **Anonymisation** possible en alternative (retirer tout identifiant direct/indirect) pour conserver des
  statistiques agrégées sans renseignement personnel.
- Journaliser les opérations de purge (date, périmètre).

## 4. Droit à l'effacement / suppression de compte
L'usager peut demander la **suppression de son compte et de ses données** :
- aujourd'hui : par courriel à **confidentialite@monplanfin.ca** ;
- **à implémenter (recommandé)** : un **bouton « Supprimer mon compte »** au tableau de bord +
  un **export (JSON/CSV)** de ses données (portabilité). → *Tâche dev — voir liste Cowork/Claude Code.*

## 5. Suivi des mesures

| Mesure | Responsable | Statut |
|---|---|---|
| Implémenter la purge auto (inactivité 24 mois) | Dev (Claude Code) | ☐ |
| Implémenter « Supprimer mon compte » + export | Dev (Claude Code) | ☐ |
| Confirmer durée « 7 ans » selon statut AMF | Yuri | ☐ |
| Faire relire cette politique | Yuri | ☐ |
