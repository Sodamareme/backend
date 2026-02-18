# ---------- STAGE 1 : BUILD ----------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Build Nest
RUN npm run build


# ---------- STAGE 2 : PRODUCTION ----------
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

# Copier prisma schema (important)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
