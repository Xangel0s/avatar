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
RUN cat > /app/generate-config.sh << 'SCRIPT_EOF'
#!/bin/sh
set -e

echo "🔧 Generando archivos de configuración desde variables de entorno..."

# Generar api.json desde variables de entorno
cat > /app/api.json << EOF
{
  "key": "${DID_API_KEY:-🤫}",
  "url": "https://api.d-id.com",
  "websocketUrl": "wss://ws-api.d-id.com",
  "service": "${DID_SERVICE:-clips}",
  "elevenlabsKey": ""
}
EOF

# Generar openrouter.json desde variables de entorno
cat > /app/openrouter.json << EOF
{
  "apiKey": "${OPENROUTER_API_KEY:-TU_API_KEY_AQUI}",
  "model": "${OPENROUTER_MODEL:-deepseek/deepseek-chat}",
  "visionModel": "${OPENROUTER_VISION_MODEL:-openai/gpt-4o-mini}",
  "audioModel": "${OPENROUTER_AUDIO_MODEL:-openai/whisper}",
  "appUrl": "${OPENROUTER_APP_URL:-https://avatar.edvio.app}",
  "appName": "${OPENROUTER_APP_NAME:-Avatar Realtime Agent}"
}
EOF

echo "✅ Archivos de configuración generados:"
echo "   - /app/api.json"
echo "   - /app/openrouter.json"

# Verificar que las API keys requeridas estén configuradas
if [ "$DID_API_KEY" = "" ] || [ "$DID_API_KEY" = "tu_email@ejemplo.com:tu_api_key_de_did" ]; then
  echo "⚠️  ADVERTENCIA: DID_API_KEY no está configurada o usa el valor por defecto"
fi

if [ "$OPENROUTER_API_KEY" = "" ] || [ "$OPENROUTER_API_KEY" = "sk-or-v1-tu_api_key_de_openrouter" ]; then
  echo "⚠️  ADVERTENCIA: OPENROUTER_API_KEY no está configurada o usa el valor por defecto"
fi

SCRIPT_EOF
RUN chmod +x /app/generate-config.sh

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Iniciar script de configuración y luego el servidor
CMD ["/bin/sh", "-c", "/app/generate-config.sh && node app.js"]

