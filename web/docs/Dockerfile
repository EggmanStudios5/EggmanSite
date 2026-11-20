FROM node:22.14.0-alpine AS build
WORKDIR /app

COPY package.json astro.config.mjs ./
RUN npm install --no-audit --no-fund

COPY src ./src
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS runtime
USER 101:101
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
