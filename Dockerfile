# syntax=docker/dockerfile:1
# Cargill Custom Apps frontend - React (Vite) built to static files, served by nginx.
# nginx also proxies /api to the backend (API_UPSTREAM), so the browser talks to a single origin.
#   docker build -t cargill-custom-apps-web .
#   docker run -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:4000 cargill-custom-apps-web

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27

# ---- build ----
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:${NGINX_VERSION}-alpine AS runtime
# Rendered to /etc/nginx/conf.d/default.conf at start-up (envsubst of ${API_UPSTREAM})
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV API_UPSTREAM=http://backend:4000
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
