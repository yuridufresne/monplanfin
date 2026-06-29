# Notes — Position AMF & statut conformité MonPlanFin
*(Mémo de référence — consigné le 2026-06-29. Mettre à jour si le modèle d'affaires change.)*

## Position AMF (pourquoi MonPlanFin est largement HORS du régime)
Tant que MonPlanFin reste **un outil éducatif** qui :
- **ne vend aucun produit** financier (assurance, fonds, valeurs mobilières),
- **n'est pas un cabinet inscrit**,
- **ne donne pas de recommandation personnalisée** (juste des **estimations générales**),

→ il **ne nécessite normalement pas d'inscription à l'AMF**. La plupart des points « AMF » de l'audit
sont donc **préventifs**, pas des obligations légales pour cette situation.

## Les 3 lignes à NE PAS franchir
1. **Titres protégés** — « **planificateur financier** » est un titre réservé (IQPF/AMF). Ne pas l'utiliser
   sans certification. Rester « **estimateur / outil éducatif** ». Prudence aussi avec « conseiller financier ».
2. **Frontière du conseil personnalisé** — OK pour une estimation générale ; PAS OK de dire « toi, achète
   CE produit / fais CETTE action » présenté comme un conseil. → garder le **disclaimer « ceci n'est pas un
   conseil financier personnalisé »** sur les pages d'analyse (assurance bon marché qui maintient le statut éducatif).
3. **Pas de promesse trompeuse** (rendements garantis, etc.) dans la publicité.

## À NE PAS faire
- **Ne pas afficher « Membre AMF »** — MonPlanFin n'est pas inscrit, ce serait **faux**.
  (La ligne d'audit « ajouter Membre AMF » ne vaut QUE si un jour il y a inscription.)

## Quand re-vérifier (AMF / avocat)
Si un jour MonPlanFin : vend des produits, fait des recommandations nominatives, ou facture du conseil
→ **reconfirmer avec l'AMF** (centre d'information) ou un avocat. *(Info générale, pas un avis juridique.)*

---

## Statut conformité — session du 2026-06-29
**Fait :**
- 3 docs Loi 25 rédigés (EFVP, incidents+registre, rétention) — brouillons à faire relire.
- DPA **Supabase** (signé, PandaDoc) + **Vercel** (auto-intégré) → PDF archivés dans `conformite/`.
- Password serveur Supabase **6→8 + « Letters and digits »** (action urgente audit #4) ✅.
- RLS déjà ON 9/9 ; `/agent/debug` retiré ; clés en env (faits par Claude Code).
- Backups vérifiés : **plan gratuit = AUCUN backup auto**.

**À faire AVANT lancement public :**
- **Supabase Pro** (~25 $/mois) → backups quotidiens + « prevent leaked passwords ».
- **Vercel Pro** (~20 $/mois) → usage commercial + DPA pleinement applicable (Hobby = non commercial).
- Évaluer **migration région `ca-central-1`** (élimine le transfert hors Canada → simplifie Loi 25).
- Faire **relire les 3 docs** par un conseiller en protection des RP / avocat.
- (Bêta, en attendant) **`pg_dump` manuel** périodique.

**Reste côté code (Claude Code) :**
- Disclaimer AMF « pas un conseil personnalisé » sur toutes les pages d'analyse (prompt prêt — branche → Preview).
- Bouton « Supprimer mon compte » + export JSON/CSV (droit à l'effacement / portabilité Loi 25).

> Suivi des actions cochables : voir `conformite/EFVP-transfert-hors-Canada.md`.
