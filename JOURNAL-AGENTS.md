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
