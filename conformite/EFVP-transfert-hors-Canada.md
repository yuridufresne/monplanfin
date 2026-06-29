# Évaluation des facteurs relatifs à la vie privée (EFVP)
## Communication / hébergement de renseignements personnels hors Québec — MonPlanFin

> **Statut : BROUILLON à valider.** Document interne exigé par la Loi 25 (art. 3.3.1, RLRQ c. P-39.1)
> avant de communiquer/héberger des renseignements personnels hors du Québec.
> ⚠️ À faire relire par un conseiller en protection des renseignements personnels ou un avocat
> avant de s'y fier. Niveau « bêta » — à approfondir avant l'ouverture au grand public.

| Champ | Valeur |
|---|---|
| Organisation | MonPlanFin (exploitant : Emmanuel Dufresne) |
| Responsable de la protection des RP (RPRP) | Emmanuel Dufresne — confidentialite@monplanfin.ca |
| Date de l'évaluation | _(à dater)_ |
| Version | 0.1 (brouillon) |

---

## 1. Description du transfert

| Élément | Détail |
|---|---|
| Sous-traitant | **Supabase** (base de données, authentification) |
| Lieu d'hébergement | **Hors Canada** — infrastructure AWS, région **à confirmer (probable : `us-east-1`, États-Unis)** |
| Sous-traitant secondaire | **Vercel** (hébergement du site / front-end) — infrastructure aussi hors Canada |
| Renseignements communiqués | Courriel, mot de passe (haché par Supabase Auth), et **données financières sensibles saisies par l'usager** (revenus, dettes, épargne, objectifs) |
| Finalité | Stockage et traitement nécessaires au fonctionnement de l'outil d'analyse de besoins financiers (ABF) |

---

## 2. Analyse des facteurs (art. 3.3.1 Loi 25)

**a) Sensibilité des renseignements**
Élevée. Des données financières personnelles (revenus, dettes, patrimoine) sont en jeu. → Mesures renforcées requises.

**b) Finalité de l'utilisation**
Strictement limitée au fonctionnement de l'outil pour l'usager lui-même. Pas de revente, pas de profilage publicitaire sur ces données.

**c) Mesures de protection (y compris contractuelles)**
- Chiffrement en transit (HTTPS / TLS 1.3 — Vercel).
- Chiffrement au repos (Supabase / AWS, par défaut).
- Mots de passe hachés (Supabase Auth).
- **RLS (Row Level Security) activée** sur toutes les tables (cloisonnement par usager) — *vérifié 9/9*.
- **DPA (entente de traitement) à accepter/archiver** avec Supabase ET Vercel _(action en cours — voir §4)_.

**d) Régime juridique applicable dans le territoire d'accueil (É.-U.)**
Les États-Unis n'offrent pas une protection « équivalente » au sens du Québec, et des lois d'accès gouvernemental (ex. CLOUD Act) s'appliquent. Le risque résiduel est **mitigé** par : la limitation de finalité, le chiffrement, la RLS, et l'absence de données d'identification gouvernementale (pas de NAS, pas de n° de carte).

---

## 3. Conclusion de l'évaluation

Le transfert **peut être effectué** sous réserve des mesures de protection ci-dessus, le **risque résiduel étant jugé acceptable** pour un outil éducatif en phase bêta, **à condition** de :
1. signer/archiver les **DPA** Supabase + Vercel ;
2. maintenir la **RLS** et le chiffrement ;
3. **réévaluer** avant toute ouverture massive au public.

### ✅ Recommandation forte
**Migrer la base Supabase vers la région `ca-central-1` (Canada Central, Montréal).** Si les données restent **au Canada**, il n'y a **plus de communication hors Québec/Canada** au sens problématique → cette EFVP devient en grande partie sans objet et la conformité est nettement simplifiée. À évaluer avant le lancement public.

---

## 4. Suivi des mesures

| Mesure | Responsable | Échéance | Statut |
|---|---|---|---|
| Confirmer la région Supabase exacte | Yuri | — | ☐ |
| Accepter + archiver DPA Supabase | Yuri | — | ✅ signé + archivé (2026-06-29) |
| Accepter + archiver DPA Vercel | Yuri | — | ✅ DPA auto-intégré, PDF archivé (2026-06-29) |
| Passer Vercel au plan **Pro** (Hobby = non commercial) | Yuri | avant lancement public | ☐ |
| Passer Supabase au plan **Pro** → **backups quotidiens** (gratuit = aucun backup) | Yuri | avant lancement public | ☐ |
| (Bêta) Faire un **`pg_dump` manuel** périodique en attendant Pro | Yuri | récurrent | ☐ |
| Évaluer migration `ca-central-1` | Yuri | avant lancement public | ☐ |
| Faire relire cette EFVP (conseiller/avocat) | Yuri | avant lancement public | ☐ |
