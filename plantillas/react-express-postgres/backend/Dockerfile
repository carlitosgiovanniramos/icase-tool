FROM node:22-alpine

WORKDIR /app

# Primero solo las dependencias: si el código cambia pero package.json no, Docker reutiliza esta capa.
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=4000
EXPOSE 4000

# No ejecutar como root dentro del contenedor.
USER node

CMD ["node", "src/index.js"]
