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

# Crear script para iniciar ngrok y el servidor
RUN cat > /app/start.sh << 'START_EOF'
#!/bin/sh
set -e

# Generar configuración
/app/generate-config.sh

# Iniciar servidor en background
node app.js &
SERVER_PID=$!

# Esperar a que el servidor esté listo
sleep 3

# Iniciar ngrok si NGROK_AUTHTOKEN está configurado
if [ ! -z "$NGROK_AUTHTOKEN" ]; then
  echo "🚀 Iniciando ngrok..."
  ngrok config add-authtoken "$NGROK_AUTHTOKEN"
  ngrok http 3000 --log=stdout &
  NGROK_PID=$!
  
  # Esperar a que ngrok esté listo
  sleep 5
  
  # Obtener URL de ngrok
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
  if [ ! -z "$NGROK_URL" ]; then
    echo "✅ Ngrok URL: $NGROK_URL"
    echo "🌐 Accede a tu aplicación en: $NGROK_URL"
    echo "🌐 WebSocket streaming en: $NGROK_URL/ws-streaming"
  fi
  
  # Esperar a que los procesos terminen
  wait $SERVER_PID $NGROK_PID
else
  echo "⚠️  NGROK_AUTHTOKEN no está configurado. Ngrok no se iniciará."
  echo "💡 Para usar ngrok, configura la variable de entorno NGROK_AUTHTOKEN"
  wait $SERVER_PID
fi
START_EOF
RUN chmod +x /app/start.sh

# Iniciar script que ejecuta configuración, servidor y ngrok
CMD ["/app/start.sh"]

