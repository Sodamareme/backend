# ===============================
# STAGE 1 — BUILD
# ===============================
FROM node:18-alpine AS builder

WORKDIR /app

# Installer dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du projet
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build NestJS (génère dist/)
RUN npm run build


# ===============================
# STAGE 2 — PRODUCTION
# ===============================
FROM node:18-alpine

WORKDIR /app

# Installer uniquement dépendances prod
COPY package*.json ./
RUN npm install --omit=dev

# Copier Prisma généré
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier build compilé
COPY --from=builder /app/dist ./dist

# Exposer port
EXPOSE 3000

# Variables production
ENV NODE_ENV=production

# Démarrage propre
CMD ["node", "dist/main.js"]
