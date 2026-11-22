# ==========================================
# Stage 1 - Build React/PROD_VITE Application
# ==========================================
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

ARG VITE_MSAL_CLIENT_ID
ENV VITE_MSAL_CLIENT_ID=${VITE_MSAL_CLIENT_ID}

ARG VITE_MSAL_TENANT_ID
ENV VITE_MSAL_TENANT_ID=${VITE_MSAL_TENANT_ID}

ARG VITE_MSAL_AUTHORITY
ENV VITE_MSAL_AUTHORITY=${VITE_MSAL_AUTHORITY}

ARG VITE_MSAL_REDIRECT_URI
ENV VITE_MSAL_REDIRECT_URI=${VITE_MSAL_REDIRECT_URI}

ARG VITE_MSAL_POST_LOGOUT_REDIRECT_URI
ENV VITE_MSAL_POST_LOGOUT_REDIRECT_URI=${VITE_MSAL_POST_LOGOUT_REDIRECT_URI}

ARG VITE_MSAL_API_SCOPE
ENV VITE_MSAL_API_SCOPE=${VITE_MSAL_API_SCOPE}


RUN npm run build

# ==========================================
# Stage 2 - Nginx Runtime (non-root, port 8080)
# ==========================================
# Alpine's own nginx package replaces nginxinc/nginx-unprivileged:stable-alpine (nginx 1.30.6, no patched
# image published yet). Security fixes enforced at build time - the build fails if a fixed version is missing:
#   nginx       >= 1.30.7-r0  CVE-2026-113425, CVE-2026-121810, CVE-2026-123007, CVE-2026-123633, CVE-2026-123634
#   zlib        >= 1.4-r0     CVE-2026-4738
#   brotli-libs >= 1.2.1-r0   CVE-2026-111497 (only if present; the nginx package does not need it)
#   curl / libcurl            CVE-2026-86411, -86413, -86414, -87861, -87866, -92388, -94265: not installed at all
#                             (the health check uses busybox wget)
FROM alpine:3.24@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS runtime

RUN set -eux; \
    apk upgrade --no-cache; \
    apk add --no-cache 'nginx>=1.30.7-r0' 'zlib>=1.4-r0'; \
    if apk info -e brotli-libs >/dev/null 2>&1; then apk add --no-cache 'brotli-libs>=1.2.1-r0'; fi; \
    for p in curl libcurl; do if apk info -e "$p" >/dev/null 2>&1; then apk del --no-cache "$p"; fi; done; \
    for p in curl libcurl; do if apk info -e "$p" >/dev/null 2>&1; then echo "$p must not be installed" >&2; exit 1; fi; done; \
    mkdir -p /usr/share/nginx/html /etc/nginx/templates /var/lib/nginx /var/log/nginx /run/nginx; \
    chown -R nginx:nginx /usr/share/nginx/html /var/lib/nginx /var/log/nginx /run/nginx; \
    nginx -v

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/docker-entrypoint.sh /docker-entrypoint.sh
# Strip Windows line endings (Git autocrlf checkouts) and make the entrypoint executable
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod 0755 /docker-entrypoint.sh
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# /api/ is proxied to this upstream (override at run time, e.g. -e API_UPSTREAM=http://api:4000)
ENV API_UPSTREAM=http://backend:4000

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
