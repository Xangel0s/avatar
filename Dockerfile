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

# Crear script para generar archivos de configuración desde variables de entorno
RUN echo '#!/bin/sh' > /app/generate-config.sh && \
    echo 'set -e' >> /app/generate-config.sh && \
    echo '' >> /app/generate-config.sh && \
    echo '# Generar api.json desde variables de entorno' >> /app/generate-config.sh && \
    echo 'cat > /app/api.json << EOF' >> /app/generate-config.sh && \
    echo '{' >> /app/generate-config.sh && \
    echo '  "key": "${DID_API_KEY:-🤫}",' >> /app/generate-config.sh && \
    echo '  "url": "https://api.d-id.com",' >> /app/generate-config.sh && \
    echo '  "websocketUrl": "wss://ws-api.d-id.com",' >> /app/generate-config.sh && \
    echo '  "service": "${DID_SERVICE:-clips}",' >> /app/generate-config.sh && \
    echo '  "elevenlabsKey": ""' >> /app/generate-config.sh && \
    echo '}' >> /app/generate-config.sh && \
    echo 'EOF' >> /app/generate-config.sh && \
    echo '' >> /app/generate-config.sh && \
    echo '# Generar openrouter.json desde variables de entorno' >> /app/generate-config.sh && \
    echo 'cat > /app/openrouter.json << EOF' >> /app/generate-config.sh && \
    echo '{' >> /app/generate-config.sh && \
    echo '  "apiKey": "${OPENROUTER_API_KEY:-TU_API_KEY_AQUI}",' >> /app/generate-config.sh && \
    echo '  "model": "${OPENROUTER_MODEL:-deepseek/deepseek-chat}",' >> /app/generate-config.sh && \
    echo '  "visionModel": "${OPENROUTER_VISION_MODEL:-openai/gpt-4o-mini}",' >> /app/generate-config.sh && \
    echo '  "audioModel": "${OPENROUTER_AUDIO_MODEL:-openai/whisper}",' >> /app/generate-config.sh && \
    echo '  "appUrl": "${OPENROUTER_APP_URL:-http://localhost:3000}",' >> /app/generate-config.sh && \
    echo '  "appName": "${OPENROUTER_APP_NAME:-Avatar Realtime Agent}"' >> /app/generate-config.sh && \
    echo '}' >> /app/generate-config.sh && \
    echo 'EOF' >> /app/generate-config.sh && \
    echo '' >> /app/generate-config.sh && \
    echo 'echo "✅ Archivos de configuración generados desde variables de entorno"' >> /app/generate-config.sh && \
    chmod +x /app/generate-config.sh

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Iniciar script de configuración y luego el servidor
CMD ["/bin/sh", "-c", "/app/generate-config.sh && node app.js"]

