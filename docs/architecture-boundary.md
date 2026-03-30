# Frontend / Backend Boundary

## Decision
Le backend Nest est la frontiere API officielle pour la logique metier et l'acces a la base.

Le frontend Next ne doit pas dupliquer cette logique avec des routes Prisma paralleles, sauf exception explicitement documentee.

## Implications For Backend
- les domaines metier existants doivent exposer leur contrat via Nest
- Prisma reste cote backend pour la logique applicative normale
- si le frontend a besoin d'un nouvel ecran ou flux, on prefere etendre l'API Nest plutot que d'ajouter une route Prisma Next

## Frontend Exception Policy
Les routes frontend `app/api` sont acceptees uniquement pour:
- proxy d'authentification
- adaptation au runtime Next
- besoins techniques non metier

## Current Team Rule
Pour tout nouveau travail sur `modules`, `grades`, `learners`, `referentials`, `promotions` et autres domaines existants:
- ajouter ou corriger l'endpoint dans Nest
- faire consommer cet endpoint par le frontend
- eviter toute nouvelle duplication Prisma dans le frontend
