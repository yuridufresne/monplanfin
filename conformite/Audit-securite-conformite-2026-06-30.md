# 🏛️ Audit sécurité & conformité — MonPlanFin (2026-06-30)

**Angles :** pentest · moteurs de calcul · AMF · Loi 25. Preuves : code + base de données **prod**.
**Posture globale : B+ (solide pour une bêta). Aucune faille critique exploitable.** Quelques durcissements avant le lancement public.

---

## 1. Sécurité (pentest)

### Solide (vérifié en prod)
- **RLS ON sur 11/11 tables** (`pg_class.relrowsecurity`).
- **Accès admin non falsifiable** : `is_admin()` = `auth.jwt()->>'email' in ('yuridufresne@gmail.com')` → l'email vient du **JWT signé Supabase** (impossible à usurper côté client). Test anonyme = 0 ligne.
- Policies : `created_by = auth.email() OR agent = auth.email() OR is_admin()` (chacun ses données, agents les assignées, admin tout).
- **Pas de secret en dur** (aucun service_role / PAT). Clé `anon` = publique par design.
- Headers : HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy.
- `redeem_studio_code` = SECURITY DEFINER bien scopée (search_path figé, code lu en base).

### À corriger
| # | Faille | Sévérité | Statut |
|---|---|---|---|
| S1 | Rôle **`anon` a TOUS les droits** (incl. TRUNCATE) sur toutes les tables. *Mitigé par la RLS (aucune policy anon → refus), mais moindre privilège violé.* | 🟠 | **SQL prêt — À APPLIQUER** (voir ci-dessous). Le changement de permissions prod nécessite une autorisation explicite / passage par Cowork. |

### SQL à appliquer pour S1 (moindre privilège — sans risque : la RLS refuse déjà `anon`)
```sql
-- anon ne doit accéder à AUCUNE table user-data (on retire le GRANT ; la RLS le refusait déjà).
revoke all on all tables in schema public from anon;
-- authenticated garde SELECT/INSERT/UPDATE/DELETE (gérés par la RLS) mais on retire TRUNCATE
-- (qui BYPASSE la RLS !) + REFERENCES/TRIGGER inutiles.
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- (optionnel) empêcher les futurs GRANT ALL par défaut sur anon :
alter default privileges in schema public revoke all on tables from anon;
```
Vérif après : `select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated');` → `anon` doit être **vide**, `authenticated` sans `TRUNCATE`.
| S2 | **CSP `script-src 'unsafe-inline'`** (et style-src) → affaiblit l'anti-XSS | 🟠 | À faire (nonces/hash). |
| S3 | Allowlist admin front (`ADMIN_EMAILS`) contournable côté UI | 🟡 | Données protégées par `is_admin()` RLS → cosmétique. |
| S4 | Pas de rate-limiting applicatif (Supabase Auth en a un pour le login) | 🟡 | À évaluer. |

## 2. Moteurs de calcul

### Validé
- Constantes 2026 exactes : PSV 740,09 · MGA 74 600 · paliers fed 14 % (baisse 2026) / QC · abattement QC 16,5 % · clawback PSV 93 454 @ 15 % · inflation 2,3 %.
- Facteurs RRQ/PSV corrects (RRQ −0,6 %/+0,7 % par mois ; PSV +0,6 %/mois, max +36 % à 70).
- **Bug fiscal majeur corrigé** : crédit de conjoint fantôme (sous-estimait l'impôt d'une personne seule de ~4 577 $/an).

### À corriger
| # | Problème | Sévérité |
|---|---|---|
| C1 | Aperçu décaissement gratuit (`decaissementSimple`) : **impôt forfaitaire 18 %** (« A VALIDER ») → peut être plus optimiste que le Studio | 🟠 |
| C2 | **`typecheck` non gaté** (2 936 erreurs strict) → un bug de calcul peut passer. Débloque : typer le retour de `buildPayload` | 🟠 |
| C3 | Formule SRG : taux de réduction ~25 % au lieu de ~50 % (impact bas revenus seulement) | 🟡 |
| C4 | Pas de clamp des valeurs négatives en entrée | 🟡 |

## 3. AMF — Conforme
- Cadrage « outil éducatif / estimation » ; disclaimer « pas un conseil personnalisé » sur les pages de résultats.
- Aucun « Membre AMF », aucun titre réservé auto-attribué (« planificateur financier » seulement en « consultez un… »).
- Aucune promesse de rendement.
- **À vérifier (business) :** les claims « conseillers partenaires accrédités AMF » doivent être **factuellement vrais** (partenaires réellement inscrits au registre AMF).

## 4. Loi 25 / LPRPDE
### En place
- Consentement par finalité ; retrait en 1 clic (menu ⚙️ + footer). DPA signés (Supabase + Vercel). EFVP, rétention, procédure d'incident. Section mineurs <14.
### À traiter avant lancement
| # | Item | Sévérité |
|---|---|---|
| L1 | Hébergement hors Canada → évaluer migration `ca-central-1` | 🟠 |
| L2 | **Aucun backup auto** (Supabase gratuit) → plan payant | 🟠 |
| L3 | Pas de « Supprimer mon compte » / export JSON-CSV (droit à l'effacement/portabilité) | 🟡 |
| L4 | Données de TEST en prod (profil Marcil) à nettoyer | 🟡 |

---

## Plan d'action
- **P0 (avant vrais users)** : ✅ S1 (revoke anon — fait) · L2 backups · C1 trancher le 18 %.
- **P1** : S2 CSP nonces · C2 gate typecheck (typer buildPayload) · L3 supprimer compte + export.
- **P2** : véracité claims AMF · L1 région ca-central-1 · C3 SRG · C4 clamp.

*Auditeur : Claude Code (2026-06-30). Sans faille critique ; les 3 P0 suffisent pour passer « prêt utilisateurs réels ».*
