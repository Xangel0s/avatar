# Avatar Realtime Agent

Aplicación de avatar en tiempo real con análisis facial, detección de emociones e integración D-ID Live Streaming.

## 🚀 Inicio Rápido con Ngrok

### Requisitos

- Node.js 18+
- Docker (opcional)
- Cuenta de ngrok (gratis en https://ngrok.com)

### Configuración

1. **Obtener token de ngrok**:
   - Regístrate en https://ngrok.com
   - Obtén tu authtoken desde el dashboard

2. **Configurar variables de entorno**:

```bash
# D-ID API
DID_API_KEY=tu_email@ejemplo.com:tu_api_key_de_did

# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-tu_api_key_de_openrouter

# Ngrok (requerido para HTTPS)
NGROK_AUTHTOKEN=tu_ngrok_authtoken
```

3. **Ejecutar con Docker**:

```bash
docker build -t avatar-app .
docker run -d \
  -p 3000:3000 \
  -e DID_API_KEY=tu_email@ejemplo.com:tu_api_key \
  -e OPENROUTER_API_KEY=sk-or-v1-tu_api_key \
  -e NGROK_AUTHTOKEN=tu_ngrok_authtoken \
  --name avatar \
  avatar-app
```

4. **Ver URL de ngrok**:

```bash
docker logs avatar
```

Busca la línea que dice `✅ Ngrok URL: https://...`

### Ejecutar Localmente

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
export DID_API_KEY=tu_email@ejemplo.com:tu_api_key
export OPENROUTER_API_KEY=sk-or-v1-tu_api_key
export NGROK_AUTHTOKEN=tu_ngrok_authtoken

# Iniciar
npm start
```

## 📋 Variables de Entorno

### Requeridas

- `DID_API_KEY`: API key de D-ID (formato: email:key)
- `OPENROUTER_API_KEY`: API key de OpenRouter
- `NGROK_AUTHTOKEN`: Token de autenticación de ngrok

### Opcionales

- `PORT`: Puerto del servidor (default: 3000)
- `HOST`: Host del servidor (default: 0.0.0.0)
- `OPENROUTER_MODEL`: Modelo de OpenRouter (default: deepseek/deepseek-chat)
- `OPENROUTER_VISION_MODEL`: Modelo de visión (default: openai/gpt-4o-mini)
- `OPENROUTER_APP_URL`: URL de la aplicación (se actualiza automáticamente con ngrok)
- `OPENROUTER_APP_NAME`: Nombre de la aplicación (default: Avatar Realtime Agent)

## 🌐 Acceso

Una vez iniciado, ngrok generará una URL HTTPS automáticamente:

- **Aplicación principal**: `https://xxxx-xxxx-xxxx.ngrok-free.app`
- **WebSocket streaming**: `https://xxxx-xxxx-xxxx.ngrok-free.app/ws-streaming`
- **Health check**: `https://xxxx-xxxx-xxxx.ngrok-free.app/health`

## 🔧 Características

- ✅ Avatar en tiempo real con D-ID
- ✅ Análisis facial con TensorFlow.js
- ✅ Detección de gestos con MediaPipe
- ✅ Conversación por voz con Web Speech API
- ✅ Integración con OpenRouter (múltiples modelos LLM)
- ✅ Análisis visual del entorno
- ✅ HTTPS automático con ngrok

## 📝 Notas

- La URL de ngrok cambia cada vez que reinicias (a menos que uses un plan de pago)
- Para URLs estables, considera el plan de pago de ngrok
- El servidor escucha en `0.0.0.0:3000` para permitir conexiones externas
