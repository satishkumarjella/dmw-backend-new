# Multi-stage build for backend API
FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM base AS production
RUN npm install --omit=dev
COPY dist ./dist

# API runtime stage
FROM node:20-alpine AS api-stage
WORKDIR /usr/src/app
COPY --from=production /usr/src/app/node_modules ./node_modules
COPY --from=production /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]

# Nginx proxy stage (this is what your docker-compose.prod.yml expects)
FROM nginx:alpine AS nginx-stage
# Copy your nginx configuration for API routing
COPY nginx.conf /etc/nginx/nginx.conf
# Or copy to the default configuration directory
COPY nginx/api-proxy.conf /etc/nginx/conf.d/default.conf