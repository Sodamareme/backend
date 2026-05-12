# Backend Environment Contract

## Objectif
Ce document fixe le contrat minimal pour lancer le backend de facon coherente en local, avec Docker, Prisma et le seed.

## Variables requises

Le backend utilise au minimum les variables suivantes :

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Pour `docker-compose`, le projet utilise aussi :

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `APP_PORT`

Le fichier de reference a copier est [`.env.example`](/home/mr-sem-s/Documents/in-odc/backend/.env.example).

## Demarrage local

1. Copier le fichier d'exemple :

```bash
cp .env.example .env
```

2. Verifier que `DATABASE_URL` pointe vers votre base locale.

3. Installer les dependances avec l'outil choisi par l'equipe.

Note :
- le repo contient actuellement plusieurs lockfiles
- le `Dockerfile` utilise `npm`
- tant qu'un ticket dedie ne normalise pas le package manager, l'equipe doit rester coherente sur une seule methode par environnement

4. Generer Prisma :

```bash
npx prisma generate
```

5. Appliquer les migrations :

```bash
npx prisma migrate dev
```

6. Lancer le seed :

```bash
npx ts-node prisma/seed.ts
```

7. Demarrer le backend :

```bash
npm run start:dev
```

## Demarrage avec Docker

Le fichier [docker-compose.yml](/home/mr-sem-s/Documents/in-odc/backend/docker-compose.yml) demarre :

- `db` sur Postgres 15
- `app` sur le port `3000` par defaut

Le service `app` construit sa propre `DATABASE_URL` a partir de :

- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Commande de demarrage :

```bash
docker compose up --build
```

Ports par defaut :

- backend : `http://localhost:3000`
- postgres : `localhost:5433`

## Contrat Prisma

- `prisma/schema.prisma` depend de `DATABASE_URL`
- avant un build propre, executer `prisma generate`
- avant un premier lancement sur une base vide, executer les migrations
- le seed suppose que les tables Prisma existent deja

## Contrat du seed

Le seed dans [prisma/seed.ts](/home/mr-sem-s/Documents/in-odc/backend/prisma/seed.ts) cree des comptes de base pour les roles principaux :

- `ADMIN`
- `RESTAURATEUR`
- `VIGIL`
- `COACH`
- `SURVEILLANT`

Le seed est pense pour un environnement de developpement ou de demo.

Comptes de reference crees :

- admin : `admin@sonatel-academy.sn`
- restaurateurs : `fatou.restauratrice@sonatel.sn`, `moussa.restaurateur@sonatel.sn`
- vigils : `alioune.vigil@sonatel.sn`, `mariama.vigil@sonatel.sn`
- surveillants : `ibrahima.surveillant@sonatel.sn`, `rokhaya.surveillant@sonatel.sn`

Mots de passe de seed actuels :

- admin : `Admin1234!`
- restaurateurs : `Restau123!`
- vigils : `Vigil123!`
- surveillants : `Surveil123!`

Attention :
- ces credentials ne doivent pas etre reutilises en production
- toute evolution de `seed.ts` doit garder la compatibilite avec le schema Prisma courant

## Verification minimale avant PR

Avant une PR touchant l'environnement backend :

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit
./node_modules/.bin/nest build
```

## Limites connues

- aucune doc d'environnement n'etait presente avant ce ticket
- le repo n'a pas encore de package manager backend officiel
- le script `lint` existe, mais la configuration ESLint n'est pas encore complete dans ce repo
- les tests Jest sont configures, mais aucun test `*.spec.ts` n'est actuellement present
