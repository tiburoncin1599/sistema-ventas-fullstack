FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN mkdir -p /app/uploads/productos

FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache tzdata wget
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/uploads ./uploads
COPY --from=build --chown=nestjs:nodejs /app/assets ./assets

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
