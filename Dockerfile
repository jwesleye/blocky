# syntax=docker/dockerfile:1

# ---- Base: shared Node setup ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

# ---- Dependencies ----
FROM base AS deps
# Use a clean, lockfile-based install when a lockfile exists; fall back otherwise.
RUN npm ci || npm install

# ---- Development: Vite dev server with HMR ----
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---- Build: compile the static SPA ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- Production: serve static assets via nginx ----
FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
