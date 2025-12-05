#!/bin/bash
# Script para ejecutar la aplicación con ngrok

echo "🚀 Iniciando Avatar con Ngrok..."
echo ""

# Verificar que las variables de entorno estén configuradas
if [ -z "$DID_API_KEY" ]; then
  echo "⚠️  ADVERTENCIA: DID_API_KEY no está configurada"
  echo "   Configúrala con: export DID_API_KEY=tu_email@ejemplo.com:tu_api_key"
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "⚠️  ADVERTENCIA: OPENROUTER_API_KEY no está configurada"
  echo "   Configúrala con: export OPENROUTER_API_KEY=sk-or-v1-tu_api_key"
fi

if [ -z "$NGROK_AUTHTOKEN" ]; then
  echo "⚠️  ADVERTENCIA: NGROK_AUTHTOKEN no está configurada"
  echo "   Configúrala con: export NGROK_AUTHTOKEN=tu_ngrok_token"
fi

echo ""
echo "🔧 Construyendo imagen Docker..."
docker-compose build

echo ""
echo "🚀 Iniciando contenedor..."
docker-compose up -d

echo ""
echo "⏳ Esperando a que el contenedor esté listo..."
sleep 10

echo ""
echo "📋 Logs del contenedor (últimas 30 líneas):"
docker-compose logs --tail 30

echo ""
echo "✅ Aplicación iniciada!"
echo ""
echo "📊 Para ver los logs en tiempo real:"
echo "   docker-compose logs -f"
echo ""
echo "🌐 Para ver la URL de ngrok:"
echo "   docker-compose logs | grep 'Ngrok URL'"
echo ""
echo "🛑 Para detener:"
echo "   docker-compose down"

