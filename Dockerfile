# ===============================
# STAGE 1 — BUILD
# ===============================
FROM node:20-alpine AS builder  # upgrade node pour éviter warnings

WORKDIR /app

# Copier package.json et package-lock.json seulement
COPY package*.json ./

# Installer dépendances
RUN npm install

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
FROM node:20-alpine

WORKDIR /app

# Copier package.json + lockfile
COPY package*.json ./
RUN npm install --omit=dev

# Copier Prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier le build NestJS
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma  # si tu as un dossier prisma

# Exposer port
EXPOSE 3000

# Variables prod
ENV NODE_ENV=production

# Healthcheck CapRover
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Démarrage prod
CMD ["node", "dist/main.js"]
