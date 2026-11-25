# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

FROM base AS deps
RUN npm ci

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM deps AS build
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

FROM base AS gallery-backend
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./backend/
COPY tsconfig*.json ./
EXPOSE 4000
CMD ["node", "--import", "tsx/esm", "backend/src/server.ts"]
