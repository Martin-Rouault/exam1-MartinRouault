# syntax=docker/dockerfile:1
# Image gateway — Node 24 LTS (Node 25+ incompatible avec jsonwebtoken@9.0.2, cf. Changelog ENV-1)
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dépendances d'abord : couche mise en cache tant que package*.json ne change pas
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

# Exécution sans privilèges root
USER node

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8000}/health" > /dev/null || exit 1

CMD ["node", "server.js"]
