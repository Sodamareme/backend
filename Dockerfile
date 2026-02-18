# ===============================
# STAGE 1 — BUILD
# ===============================
FROM node:18-alpine AS builder

WORKDIR /app

# Installer dépendances système nécessaires à Prisma
RUN apk add --no-cache openssl

# Copier fichiers package
COPY package*.json ./

# Installer toutes les dépendances (incluant dev)
RUN npm ci

# Copier le reste du projet
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build NestJS (génère dist/)
RUN npm run build

# Vérification que le build existe (sécurité anti 502)
RUN test -f dist/main.js


# ===============================
# STAGE 2 — PRODUCTION
# ===============================
FROM node:18-alpine

WORKDIR /app

# Installer dépendances système nécessaires à Prisma
RUN apk add --no-cache openssl

# Créer utilisateur non-root (sécurité)
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copier uniquement package files
COPY package*.json ./

# Installer uniquement dépendances prod
RUN npm ci --omit=dev

# Copier Prisma généré
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier build compilé
COPY --from=builder /app/dist ./dist

# Sécuriser permissions
RUN chown -R nestjs:nodejs /app

USER nestjs

# Exposer port
EXPOSE 3000

ENV NODE_ENV=production

# Healthcheck interne (évite faux 502)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Lancement final
CMD ["node", "dist/main.js"]
