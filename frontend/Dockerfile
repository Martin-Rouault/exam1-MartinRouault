# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# URL de l'API figée au build. Sans argument : valeur de .env.production (API Render).
# Avec --build-arg REACT_APP_API_URL=... (docker-compose en local) : l'argument est prioritaire.
ARG REACT_APP_API_URL
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
