# Backend Maintenance Roadmap

## Objectif
Cette roadmap organise le travail backend a deux de maniere simple, professionnelle et maintenable.

Le choix retenu est:
- travailler principalement module par module
- garder les sujets transverses dans des PR separees
- faire des PR petites, testables et faciles a reviewer

## Strategie De Travail A Deux

### Principe principal
Le plus simple a deux devs est de travailler module par module.

Pourquoi:
- moins de conflits Git
- moins de recouvrement sur les memes fichiers
- review plus simple
- tests plus simples
- responsabilites plus claires

### Regle pratique
- 80 pourcent du travail se fait par module
- 20 pourcent du travail se fait en transverse

Travail par module:
- `attendance`
- `coaches`
- `modules`
- `grades`
- `promotions`
- `referentials`
- `learners`
- `meals`
- `vigils`

Travail transverse:
- auth et roles
- CORS
- environnement local et docker
- logging
- conventions de DTO et d'erreurs
- documentation

## Repartition Recommandee Entre Deux Devs

### Dev 1
Modules recommandes:
- `attendance`
- `coaches`
- `auth`

Responsabilite:
- routes d'acces
- roles
- permissions
- bugs visibles en production

### Dev 2
Modules recommandes:
- `modules`
- `grades`
- `promotions`
- `referentials`

Responsabilite:
- services metiers
- typage
- nettoyage
- stabilite fonctionnelle

### Modules a prendre ensuite
- `learners`
- `meals`
- `vigils`
- `users`

## Regles Git Et PR

### Branche de base
- partir de `develop` si c'est la branche d'integration de l'equipe
- sinon partir de la branche partagee officielle

### Regles de branches
- 1 branche = 1 objectif
- 1 PR = 1 sujet
- ne jamais faire une grosse branche backend globale
- toujours creer une branche fraiche depuis `develop`

### Convention de branches
- `fix/backend-attendance-vigil-access`
- `fix/backend-coaches-vigil-dashboard`
- `fix/backend-modules-route-contract`
- `fix/backend-grades-service-contract`
- `fix/backend-promotions-controller-typing`
- `refactor/backend-attendance-logging`
- `refactor/backend-modules-typing`
- `docs/backend-role-access-matrix`
- `chore/backend-env-contract`

### Convention de commits
- `fix(attendance): allow vigil access to required daily stats`
- `fix(coaches): align vigil dashboard attendance endpoints`
- `fix(modules): align route contract and update payloads`
- `fix(grades): secure grade create update and delete flows`
- `chore(promotions): remove any from controller payloads`
- `refactor(logging): replace console logs with nest logger`
- `docs(backend): add roadmap and role access matrix`
- `chore(env): document docker local and seed setup`

### Regles de PR
- PR petite et lisible
- build backend vert
- pas de `.env` committe
- pas de `dist/` committe
- description claire

### Template de PR
```md
## Resume

## Changements

## Verification
- npm run build
- tests manuels:

## Risques
```

## Backlog Par Module

### Module `attendance`
Etat:
- module critique
- deja touche par des incoherences de roles
- alimente plusieurs dashboards

US prioritaires:

#### US-ATT-01
Titre: Stabiliser l'acces `VIGIL` pour le dashboard de presence

Objectif:
- garantir que les endpoints utilises par le dashboard vigil ont les bons roles

Fichiers:
- `backend/src/attendance/attendance.controller.ts`
- `backend/src/coaches/coaches.controller.ts`

Branche:
- `fix/backend-attendance-vigil-access`

Commit:
- `fix(attendance): allow vigil access to required daily stats`

Owner:
- Dev 1

#### US-ATT-02
Titre: Documenter la matrice d'acces des routes attendance

Objectif:
- documenter qui peut appeler quoi pour `ADMIN`, `COACH`, `VIGIL`, `SURVEILLANT`, `APPRENANT`

Fichiers:
- `backend/src/attendance/attendance.controller.ts`
- `backend/docs/role-access-matrix.md`

Branche:
- `docs/backend-role-access-matrix`

Commit:
- `docs(attendance): document role access matrix`

Owner:
- Dev 1

#### US-ATT-03
Titre: Reduire les types faibles dans `attendance.service`

Objectif:
- remplacer les `any` utilitaires les plus dangereux
- clarifier les where clauses et payloads

Fichiers:
- `backend/src/attendance/attendance.service.ts`

Branche:
- `refactor/backend-attendance-typing`

Commit:
- `refactor(attendance): reduce any usage in service`

Owner:
- Dev 1

### Module `coaches`
Etat:
- lie au dashboard vigil
- beaucoup de logs debug
- quelques payloads faibles

US prioritaires:

#### US-COA-01
Titre: Nettoyer les logs debug dans `coaches.controller`

Fichiers:
- `backend/src/coaches/coaches.controller.ts`

Branche:
- `refactor/backend-coaches-logging`

Commit:
- `refactor(coaches): replace debug logs with nest logger`

Owner:
- Dev 1

#### US-COA-02
Titre: Renforcer le typage des payloads dans `coaches`

Fichiers:
- `backend/src/coaches/coaches.controller.ts`
- `backend/src/coaches/coaches.service.ts`

Branche:
- `refactor/backend-coaches-typing`

Commit:
- `refactor(coaches): improve controller and service typing`

Owner:
- Dev 1

### Module `modules`
Etat:
- module deja corrige partiellement
- encore du `any` dans le controller

US prioritaires:

#### US-MOD-01
Titre: Finaliser le contrat d'update des modules

Fichiers:
- `backend/src/modules/modules.controller.ts`
- `backend/src/modules/modules.service.ts`

Branche:
- `fix/backend-modules-route-contract`

Commit:
- `fix(modules): finalize route contract and typed updates`

Owner:
- Dev 2

#### US-MOD-02
Titre: Supprimer les payloads non types du controller modules

Fichiers:
- `backend/src/modules/modules.controller.ts`

Branche:
- `chore/backend-modules-controller-typing`

Commit:
- `chore(modules): remove any from controller payloads`

Owner:
- Dev 2

### Module `grades`
Etat:
- module deja stabilise partiellement
- encore des logs debug et de la dette de proprete

US prioritaires:

#### US-GRA-01
Titre: Nettoyer le controller grades et garder un flux CRUD propre

Fichiers:
- `backend/src/grades/grades.controller.ts`
- `backend/src/grades/grades.service.ts`

Branche:
- `fix/backend-grades-service-contract`

Commit:
- `fix(grades): stabilize grade controller and service contract`

Owner:
- Dev 2

#### US-GRA-02
Titre: Remplacer les logs debug du module grades

Fichiers:
- `backend/src/grades/grades.controller.ts`

Branche:
- `refactor/backend-grades-logging`

Commit:
- `refactor(grades): replace debug logs with nest logger`

Owner:
- Dev 2

### Module `promotions`
Etat:
- controller encore peu type
- auth partiellement heterogene

US prioritaires:

#### US-PRO-01
Titre: Supprimer les `any` prioritaires dans le controller promotions

Fichiers:
- `backend/src/promotions/promotions.controller.ts`

Branche:
- `chore/backend-promotions-controller-typing`

Commit:
- `chore(promotions): remove any from controller payloads`

Owner:
- Dev 2

#### US-PRO-02
Titre: Clarifier les routes protegees du module promotions

Fichiers:
- `backend/src/promotions/promotions.controller.ts`

Branche:
- `chore/backend-promotions-auth-policy`

Commit:
- `chore(promotions): clarify controller auth policy`

Owner:
- Dev 2

### Module `referentials`
Etat:
- traces de guards commentes
- politique d'acces peu explicite

US prioritaires:

#### US-REF-01
Titre: Uniformiser la protection du controller referentials

Fichiers:
- `backend/src/referentials/referentials.controller.ts`

Branche:
- `chore/backend-referentials-auth-policy`

Commit:
- `chore(referentials): standardize controller protection`

Owner:
- Dev 2

### Module `learners`
Etat:
- gros module
- beaucoup de logs
- plusieurs `any`

US prioritaires:

#### US-LEA-01
Titre: Nettoyer les logs debug du controller learners

Fichiers:
- `backend/src/learners/learners.controller.ts`

Branche:
- `refactor/backend-learners-logging`

Commit:
- `refactor(learners): replace debug logs with nest logger`

Owner:
- Dev 2

#### US-LEA-02
Titre: Reduire les `any` prioritaires dans le flux de creation learner

Fichiers:
- `backend/src/learners/learners.controller.ts`

Branche:
- `chore/backend-learners-controller-typing`

Commit:
- `chore(learners): reduce any usage in creation flow`

Owner:
- Dev 2

## Chantiers Transverses

### TRANS-01
Titre: Uniformiser auth et guards sur les controllers heterogenes

Fichiers:
- `backend/src/referentials/referentials.controller.ts`
- `backend/src/promotions/promotions.controller.ts`
- `backend/src/learners/pending-learners.controller.ts`

Branche:
- `chore/backend-standardize-auth-protection`

Commit:
- `chore(auth): standardize controller protection policy`

Owner:
- Dev 1

### TRANS-02
Titre: Clarifier l'environnement backend local, docker et seed

Fichiers:
- `backend/docker-compose.yml`
- `backend/prisma/seed.ts`
- `backend/docs/backend-environment.md`
- `backend/.env.example`

Branche:
- `chore/backend-env-contract`

Commit:
- `chore(env): document docker local and seed contract`

Owner:
- Dev 2

### TRANS-03
Titre: Nettoyer progressivement `AppModule` et l'infra transverse

Fichiers:
- `backend/src/app.module.ts`
- `backend/src/prisma/prisma.service.ts`

Branche:
- `refactor/backend-appmodule-cleanup`

Commit:
- `refactor(app): simplify root module wiring`

Owner:
- Dev 2

## Plan De Travail Recommande

### Sprint 1
- Dev 1: `fix/backend-attendance-vigil-access`
- Dev 2: `fix/backend-modules-route-contract`

### Sprint 2
- Dev 1: `docs/backend-role-access-matrix`
- Dev 2: `fix/backend-grades-service-contract`

### Sprint 3
- Dev 1: `refactor/backend-coaches-logging`
- Dev 2: `chore/backend-promotions-controller-typing`

### Sprint 4
- Dev 1: `refactor/backend-attendance-typing`
- Dev 2: `chore/backend-env-contract`

## Ordre De Merge Recommande
1. `fix/backend-attendance-vigil-access`
2. `fix/backend-modules-route-contract`
3. `docs/backend-role-access-matrix`
4. `fix/backend-grades-service-contract`
5. `refactor/backend-coaches-logging`
6. `chore/backend-promotions-controller-typing`
7. `refactor/backend-attendance-typing`
8. `chore/backend-env-contract`

## Check-list Avant Chaque PR
- branche creee depuis `develop`
- objectif unique
- pas de `.env` committe
- pas de `dist/` committe
- `npm run build` passe
- description de PR redigee
- risque identifie

## Notes D'Equipe
- si une PR depasse environ 300 lignes utiles, la decouper
- si deux devs touchent le meme module, ne pas travailler en parallele sur les memes fichiers
- si un sujet est transverse, faire une branche transverse dediee
- toute correction backend doit chercher a garder la compatibilite avec l'existant

## Backlog Global Backend Par Dev

Cette section sert de vue globale si l'objectif est de stabiliser l'ensemble du backend, et pas seulement quelques modules.

### Dev 1
Focus:
- auth
- guards
- roles
- access policy
- endpoints visibles depuis les dashboards

#### US-AUTH-01
Titre: Uniformiser la politique JWT et guards sur les controllers securises

Branche:
- `chore/backend-auth-guard-policy`

Commit:
- `chore(auth): standardize guard usage across controllers`

#### US-AUTH-02
Titre: Verifier la coherence entre payload JWT et `RolesGuard`

Branche:
- `fix/backend-auth-role-resolution`

Commit:
- `fix(auth): align token payload and role guard behavior`

#### US-ATT-01
Titre: Stabiliser l'acces `VIGIL` pour le dashboard attendance

Branche:
- `fix/backend-attendance-vigil-access`

Commit:
- `fix(attendance): allow vigil access to required dashboard endpoints`

#### US-ATT-02
Titre: Revoir toute la matrice des roles sur `attendance`

Branche:
- `docs/backend-attendance-role-matrix`

Commit:
- `docs(attendance): document endpoint role matrix`

#### US-ATT-03
Titre: Aligner les permissions des endpoints stats `daily`, `weekly`, `monthly`, `yearly`

Branche:
- `fix/backend-attendance-stats-access`

Commit:
- `fix(attendance): align stats endpoint permissions`

#### US-COA-01
Titre: Aligner les endpoints `coaches` utilises par `VIGIL`

Branche:
- `fix/backend-coaches-vigil-dashboard`

Commit:
- `fix(coaches): align vigil access to attendance endpoints`

#### US-COA-02
Titre: Nettoyer les payloads et logs du flux de scan coach

Branche:
- `refactor/backend-coaches-scan-cleanup`

Commit:
- `refactor(coaches): clean scan flow logging and payload handling`

#### US-MEA-01
Titre: Auditer les roles du module `meals`

Branche:
- `fix/backend-meals-role-alignment`

Commit:
- `fix(meals): align role access with business usage`

#### US-VIG-01
Titre: Typer les updates du module `vigils`

Branche:
- `chore/backend-vigils-controller-typing`

Commit:
- `chore(vigils): remove any from controller update payloads`

#### US-USR-01
Titre: Typer et securiser les routes `users`

Branche:
- `chore/backend-users-controller-typing`

Commit:
- `chore(users): remove any from controller update flow`

#### US-SEC-01
Titre: Centraliser et documenter la matrice d'acces des routes backend critiques

Branche:
- `docs/backend-role-access-matrix`

Commit:
- `docs(backend): add role access matrix for critical endpoints`

### Dev 2
Focus:
- contrats metiers
- typage
- services
- documentation
- environnement

#### US-MOD-01
Titre: Finaliser le contrat des routes `modules`

Branche:
- `fix/backend-modules-route-contract`

Commit:
- `fix(modules): finalize route contract and payload handling`

#### US-MOD-02
Titre: Supprimer les `any` restants du module `modules`

Branche:
- `chore/backend-modules-typing`

Commit:
- `chore(modules): remove any from controller and service payloads`

#### US-GRA-01
Titre: Nettoyer le CRUD `grades` et ses logs

Branche:
- `fix/backend-grades-service-contract`

Commit:
- `fix(grades): stabilize grade controller and service contract`

#### US-GRA-02
Titre: Taper davantage les updates Prisma du module `grades`

Branche:
- `refactor/backend-grades-typing`

Commit:
- `refactor(grades): improve prisma update typing`

#### US-PRO-01
Titre: Supprimer les `any` du module `promotions`

Branche:
- `chore/backend-promotions-controller-typing`

Commit:
- `chore(promotions): remove any from controller payloads`

#### US-PRO-02
Titre: Clarifier la politique d'acces du module `promotions`

Branche:
- `chore/backend-promotions-auth-policy`

Commit:
- `chore(promotions): clarify controller protection policy`

#### US-REF-01
Titre: Nettoyer la protection du module `referentials`

Branche:
- `chore/backend-referentials-auth-policy`

Commit:
- `chore(referentials): standardize controller protection`

#### US-LEA-01
Titre: Nettoyer le controller `learners`

Branche:
- `refactor/backend-learners-logging`

Commit:
- `refactor(learners): replace debug logs with nest logger`

#### US-LEA-02
Titre: Reduire les `any` du flux de creation learner

Branche:
- `chore/backend-learners-typing`

Commit:
- `chore(learners): reduce any usage in creation flow`

#### US-LEA-03
Titre: Clarifier le statut du controller pending learners

Branche:
- `chore/backend-pending-learners-policy`

Commit:
- `chore(learners): clarify pending learners access policy`

#### US-ENV-01
Titre: Documenter clairement local vs docker vs seed

Branche:
- `chore/backend-env-contract`

Commit:
- `chore(env): document docker local and seed contract`

#### US-ENV-02
Titre: Creer un `.env.example` backend propre

Branche:
- `chore/backend-env-example`

Commit:
- `chore(env): add clean backend env example`

#### US-APP-01
Titre: Alleger `AppModule` et clarifier l'infra transverse

Branche:
- `refactor/backend-appmodule-cleanup`

Commit:
- `refactor(app): simplify root module wiring`

#### US-LOG-01
Titre: Supprimer les `console.log` residuels du backend

Branche:
- `refactor/backend-standardize-logging`

Commit:
- `refactor(logging): replace debug console calls with nest logger`

#### US-DOC-01
Titre: Maintenir la documentation de frontiere et de roadmap

Branche:
- `docs/backend-maintenance-governance`

Commit:
- `docs(backend): update roadmap and architecture docs`

## Ordre Global Recommande
1. `fix/backend-auth-role-resolution`
2. `fix/backend-attendance-vigil-access`
3. `fix/backend-coaches-vigil-dashboard`
4. `fix/backend-modules-route-contract`
5. `fix/backend-grades-service-contract`
6. `chore/backend-promotions-controller-typing`
7. `chore/backend-referentials-auth-policy`
8. `refactor/backend-learners-logging`
9. `chore/backend-env-contract`
10. `refactor/backend-standardize-logging`
11. puis les PR de typage et de nettoyage restantes
