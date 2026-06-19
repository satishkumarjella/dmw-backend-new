FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Install all deps (including dev) and build the app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS api-stage
WORKDIR /usr/src/app

# Install only production deps and copy built artifacts from builder
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM nginx:alpine AS nginx-stage
# Copy nginx config from the workspace
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]