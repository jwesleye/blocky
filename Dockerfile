# syntax=docker/dockerfile:1

# ---- Base: shared Node setup ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

# ---- Dependencies ----
FROM base AS deps
RUN npm ci

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
# This is the existing static SPA image. It does not require a gallery backend.
FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ---- Gallery backend: separate Node.js service ----
# Build and run independently of the static SPA:
#   docker build --target gallery-backend -t blocky:gallery-backend .
#   docker run --rm -p 4000:4000 blocky:gallery-backend
FROM base AS gallery-backend
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./backend/
COPY tsconfig*.json ./
EXPOSE 4000
CMD ["node", "--import", "tsx/esm", "backend/src/server.ts"]
