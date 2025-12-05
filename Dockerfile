# Dockerfile para producción con Node.js y Express
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache bash

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar todos los archivos de la aplicación
COPY . .

# Crear directorio para archivos estáticos
RUN mkdir -p /app/public

# Mover archivos estáticos
RUN cp -r *.html *.js *.css *.mp4 *.png *.ico assets /app/public/ 2>/dev/null || true

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Iniciar servidor
CMD ["node", "app.js"]

