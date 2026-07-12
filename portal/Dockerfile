# syntax=docker/dockerfile:1
# =============================================================================
#  portal — Vite + React 18 + Mantine admin UI, served as static files by nginx.
#  Two stages: (1) node build → dist/, (2) nginx serves dist/ and reverse-proxies
#  /api and /ws to the backend (same-origin → no CORS, single entrypoint).
# =============================================================================

# --- stage 1: build ----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes this at build time. Must be an ABSOLUTE public URL of the API
# (the WS client does `new URL(VITE_API_URL)`), pointing at the host users hit.
# The nginx below proxies /api and /ws, so keep the host = the portal's own host.
ARG VITE_API_URL=http://localhost:8080/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# --- stage 2: serve ----------------------------------------------------------
FROM nginx:1.27-alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
