# Brief — Activer « Se connecter avec Google » sur MonPlanFin

> À donner à Claude Cowork. Autonome : tout le contexte est dedans.
> ⚠️ **MonPlanFin doit avoir son PROPRE projet Google Cloud, isolé.**
> Ne PAS utiliser ni mélanger avec un autre projet du compte (ex. « BuildersNation PipeLine INV »).

## Contexte
- Code auth **déjà déployé en production** (Supabase Auth). Email + mot de passe fonctionne.
- Bouton « Continuer avec Google » **déjà présent dans le code** (`src/lib/AuthContext.tsx` → `signInWithGoogle`). **Aucun changement de code** — c'est de la **configuration** (Google Cloud + Supabase).
- Erreur tant que non configuré : `provider is not enabled`.
- **Projet Supabase :** `ljezchpqqyxgehdwvnot`
- ✅ **Domaine `monplanfin.ca` déjà vérifié** dans le compte Google (via Google Search Console, vérification DNS antérieure). La vérification est **au niveau du COMPTE** → valable même dans un **nouveau** projet. **Pas besoin de re-vérifier le domaine.**

## Tâche A — Google Cloud Console (interface « Google Auth Platform »)

**A0. Créer un projet DÉDIÉ et NEUF**
- Nouveau projet Google Cloud nommé **« MonPlanFin »**.
- ❌ Ne PAS réutiliser un projet existant (ex. « BuildersNation PipeLine INV ») — MonPlanFin doit rester isolé, sans rapport avec les autres apps du compte.
- Sélectionner ce projet « MonPlanFin » avant de continuer.

**A1. Branding** : Nom de l'app = `MonPlanFin` · Courriel d'assistance = courriel admin · **Domaine autorisé = `monplanfin.ca`** *(déjà vérifié au niveau du compte → accepté immédiatement, même dans ce nouveau projet)*.

**A2. Audience** : type **Externe**. En mode Test, ajouter les courriels testeurs dans **Utilisateurs de test** (au moins `yuridufresne@gmail.com`). *(Pour ouvrir au public plus tard : « Publier l'application ».)*

**A3. Clients → Créer un client**
- Type : **Application Web** · Nom : `MonPlanFin Web`
- **URI de redirection autorisé** (exact, crucial) :
  `https://ljezchpqqyxgehdwvnot.supabase.co/auth/v1/callback`
- *(Optionnel)* Origine JavaScript : `https://monplanfin.ca`
- **Créer** → récupérer **ID client** + **Code secret du client**.

## Tâche B — Supabase
**Authentication → Providers → Google** : activer le toggle, coller l'**ID client** + le **Code secret**, **Save**.
*(Secrets → uniquement dans Supabase, jamais dans le code ni un chat.)*

## Tâche C — Vérification (définition de « terminé »)
1. **monplanfin.ca → /login → « Continuer avec Google »**.
2. Choisir un compte Google (présent dans *Utilisateurs de test* si l'app n'est pas publiée).
3. Doit rediriger vers **/dashboard**, connecté ; le compte apparaît dans **Supabase → Authentication → Users**.

## Pièges connus
- **URI de redirection** : exactement `https://ljezchpqqyxgehdwvnot.supabase.co/auth/v1/callback` (pas de `/` final, pas le domaine du site). Sinon → `redirect_uri_mismatch`.
- App non publiée + compte hors *Utilisateurs de test* → « accès bloqué / app non vérifiée ».
- Propagation de l'activation Google : 1-2 min.
- **Ne pas toucher** à `Supabase → Authentication → URL Configuration` (déjà réglé : `monplanfin.ca`, `localhost:5173`, `*.vercel.app`).

## Ce qu'on a déjà (ne pas refaire)
- Supabase Auth (email + mot de passe), RLS, SMTP Resend (courriels FR), Site URL/redirects.
- Domaine `monplanfin.ca` vérifié dans le compte Google (Search Console).
- Le seul élément à créer = **projet Cloud dédié « MonPlanFin » + son client OAuth Web**.
