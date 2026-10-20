# Etapa 1: compila la aplicación React con Node.
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: solo los archivos compilados, servidos por nginx. Node no queda en la imagen final.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
