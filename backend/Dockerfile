FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN mkdir -p /app/uploads

FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache tzdata

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/uploads ./uploads
COPY --from=build /app/assets ./assets

EXPOSE 3001

CMD ["node", "dist/main"]
