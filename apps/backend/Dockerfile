# Base Stage
FROM node:20-alpine as base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Development Stage
FROM base as dev
COPY . .
CMD ["npm", "run", "dev"]

# Build Stage
FROM base as builder
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine as production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
EXPOSE 5000
CMD ["node", "dist/index.js"]
