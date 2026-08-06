# syntax=docker/dockerfile:1
# =============================================================================
#  customer-web — SMART Drill customer PWA (Vite + React 18), served as static
#  files by nginx. Two stages: (1) node build → dist/, (2) nginx serves dist/
#  and reverse-proxies /api and /ws to the backend (same-origin → no CORS).
# =============================================================================

# --- stage 1: build ----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The API base is RELATIVE by default (/api/v1) and works on any host with no
# rebuild, because the nginx below proxies /api + /ws same-origin. Override with
# an absolute URL only for a cross-origin API.
ARG VITE_API_URL=/api/v1
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
