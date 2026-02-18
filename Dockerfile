# ===============================
# STAGE 1 — BUILD
# ===============================
FROM node:18-alpine AS builder

WORKDIR /app

# Installer dépendances
COPY package*.json ./
RUN npm ci

# Copier tout le code
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build NestJS (génère dist/)
RUN npm run build

# Vérification build
RUN test -f dist/main.js || (echo "Build failed: dist/main.js not found!" && exit 1)


# ===============================
# STAGE 2 — PRODUCTION
# ===============================
FROM node:18-alpine

WORKDIR /app

# Copier uniquement package files et installer prod deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copier Prisma généré
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier le build NestJS
COPY --from=builder /app/dist ./dist

# Copier les fichiers nécessaires si tu en as (ex: prisma/schema.prisma, .env si besoin)
COPY --from=builder /app/prisma ./prisma

# Vérification finale (dist/main.js)
RUN test -f dist/main.js || (echo "PROD: dist/main.js missing!" && exit 1)

# Exposer port
EXPOSE 3000

# Variables prod
ENV NODE_ENV=production

# Healthcheck pour CapRover
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Démarrage production
CMD ["node", "dist/main.js"]
