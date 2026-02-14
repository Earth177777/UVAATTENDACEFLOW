# Base Stage
FROM node:20-alpine as base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Development Stage
FROM base as dev
COPY . .
# Expose default Vite port
EXPOSE 3000 
CMD ["npm", "run", "dev", "--", "--host"]

# Build Stage
FROM base as builder
COPY . .

# Build Args which become Env Vars at build time
ARG VITE_API_HOST
ARG VITE_API_PORT
ARG VITE_API_URL
ARG VITE_WS_URL

ENV VITE_API_HOST=$VITE_API_HOST
ENV VITE_API_PORT=$VITE_API_PORT
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Nginx Production Stage
FROM nginx:alpine as production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
