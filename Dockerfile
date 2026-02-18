# ---------- STAGE 1 : BUILD ----------
FROM node:18-alpine AS builder

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

# Générer Prisma Client
RUN pnpm prisma generate

# Build Nest
RUN pnpm build


# ---------- STAGE 2 : PRODUCTION ----------
FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod

# Copier Prisma généré
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
