# Etapa 1: compila el sitio de documentación.
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Etapa 2: solo el sitio estático, servido por nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/build /usr/share/nginx/html
EXPOSE 80
