# =========================
# Stage 1 — Builder
# =========================
FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copier fichiers dépendances
COPY package.json pnpm-lock.yaml ./

RUN pnpm install

# Copier le reste du code
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build NestJS (crée dist/)
RUN pnpm run build



# =========================
# Stage 2 — Production
# =========================
FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copier uniquement les dépendances prod
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

# Copier le build
COPY --from=builder /app/dist ./dist

# Copier prisma (si migrations utilisées)
COPY --from=builder /app/prisma ./prisma

# Copier node_modules généré avec prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
