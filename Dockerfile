# Dockerfile para producción con Node.js y Express
FROM node:18-alpine

# Instalar dependencias del sistema (wget para health check, curl para ngrok)
RUN apk add --no-cache bash wget curl unzip

# Instalar ngrok
RUN curl -o /tmp/ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.zip && \
    unzip /tmp/ngrok.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/ngrok && \
    rm /tmp/ngrok.zip

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json e instalar dependencias
COPY package*.json ./
RUN npm install --only=production

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

# Iniciar script que ejecuta configuración, servidor y ngrok
CMD /bin/sh -c "/app/generate-config.sh && if [ ! -z \"\$NGROK_AUTHTOKEN\" ]; then ngrok config add-authtoken \"\$NGROK_AUTHTOKEN\" 2>/dev/null || true; ngrok http 3000 --log=stdout > /tmp/ngrok.log 2>&1 & sleep 8; NGROK_URL=\$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '\"public_url\":\"https://[^\"]*' | head -1 | cut -d'\"' -f4 || echo ''); if [ ! -z \"\$NGROK_URL\" ]; then echo ''; echo '✅ ========================================='; echo \"✅ Ngrok URL: \$NGROK_URL\"; echo '✅ ========================================='; echo \"🌐 Accede a tu aplicación en: \$NGROK_URL\"; echo \"🎥 WebSocket streaming en: \$NGROK_URL/ws-streaming\"; echo '✅ ========================================='; echo ''; if [ -f /app/openrouter.json ]; then sed -i \"s|\\\"appUrl\\\":\\\".*\\\"|\\\"appUrl\\\":\\\"\$NGROK_URL\\\"|g\" /app/openrouter.json; fi; fi; fi; exec node app.js"

