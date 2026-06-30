# 🎨 Brief Open Design — MonPlanFin
*(À coller au début de chaque session Open Design. Version « design » des garde-fous du projet.)*

## Ce qu'est MonPlanFin
Un **outil ÉDUCATIF** québécois qui estime, en ~10 min, le **Numéro d'Indépendance Financière (NIF)**
— le montant nécessaire pour être financièrement indépendant. Ton rôle (Open Design) = **conception /
prototypage**. Ton travail est ensuite **implémenté par Cursor / Claude Code** (qui codent dans le dépôt).
Donc : produis des maquettes/prototypes clairs, pas du code final destiné à `main`.

## 🚫 À NE PAS toucher / refondre
- **NE PAS redessiner la route `/analyse`** : c'est la refonte ABF **FINALE déjà déployée** (11 étapes typées).
  On n'y pousse **aucun** autre wizard. (Sauf demande explicite de Yuri.)

## ⚖️ Langage AMF (CRITIQUE dans tous les textes d'UI / titres / CTA)
- **JAMAIS** le titre réservé « **planificateur financier** » ni « **conseiller financier** ».
  Rester « **estimateur / outil éducatif** ».
- **Garder** le disclaimer « **ceci n'est pas un conseil financier personnalisé** » sur les pages d'analyse.
- **NE PAS** afficher « **Membre AMF** » (faux). **Aucune promesse de rendement**.

## 🟢 Branding (à respecter)
- **Wordmark** : « **Mon** » en couleur *foreground* (clair) + « **PlanFin** » en **VERT** (`success`, ~`rgb(39,155,112)`).
  Ne pas remettre « PlanFin » en or/blanc.
- **Thème sombre** (fond très foncé, `theme-color #050810`). Accents or discrets possibles, mais le wordmark reste vert.
- **Icône de marque** : le carré arrondi bleu nuit (favicon) — réutiliser tel quel pour les profils/avatars.

## 🔒 Confidentialité / Loi 25 (à intégrer dans les designs)
- Les options de **retrait de consentement** (partage, cookies marketing) doivent rester **faciles d'accès
  (≈ 1 clic)** — typiquement dans un menu ⚙️ + un lien discret en pied de page. **Ne pas les enterrer**,
  mais **ne pas non plus** en faire des gros boutons d'en-tête à côté de l'action principale.

## 🤝 Coordination
- Si possible, jette un œil à **`JOURNAL-AGENTS.md`** (racine) pour savoir ce que les autres agents ont fait.
- Décris clairement **ce que tu as conçu** (écrans, états, comportements) pour que Cursor/Claude Code
  puissent l'implémenter sans deviner.
