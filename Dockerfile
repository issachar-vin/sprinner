# syntax=docker/dockerfile:1

# ---- shared base -------------------------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: vite dev server with HMR ------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: emit static assets ----------------------------------------------
FROM base AS build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# ---- prod: nginx serving the built assets -----------------------------------
FROM nginx:1.29-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
