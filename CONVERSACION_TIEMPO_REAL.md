# 🎤 Conversación en Tiempo Real

## ✅ Funcionalidad Implementada

Se ha agregado la capacidad de tener conversaciones en tiempo real con el avatar usando:

1. **Reconocimiento de Voz** - Usa Web Speech API del navegador
2. **Integración con OpenRouter** - Obtiene respuestas del LLM (Llama 3.1 70B)
3. **Síntesis de Voz** - El avatar habla las respuestas usando Microsoft TTS
4. **Streaming de Video** - El avatar se mueve y habla en tiempo real

## 🚀 Cómo Usar

1. **Abre la aplicación**: `http://localhost:3000/ws-streaming`

2. **Conecta con el avatar**: Haz clic en el botón **"Connect"**
   - Espera a que el estado muestre "connected" y "ready"

3. **Inicia la conversación**: Haz clic en **"🎤 Iniciar Conversación"**
   - El navegador pedirá permiso para usar el micrófono (debes permitirlo)
   - Verás el estado "🎤 Escuchando..."

4. **Habla con el avatar**:
   - Habla claramente al micrófono
   - El sistema reconocerá tu voz y la mostrará en pantalla
   - El LLM generará una respuesta
   - El avatar hablará la respuesta automáticamente

5. **Detener la conversación**: Haz clic en **"⏹ Detener Conversación"**

## ⚙️ Configuración

### Idioma
Por defecto está configurado para **español**. Para cambiar a inglés:

1. En `streaming-client-api-ws.js`, línea ~560:
   ```javascript
   recognition.lang = 'es-ES'; // Cambiar a 'en-US' para inglés
   ```

2. En `streaming-client-api-ws.js`, línea ~680:
   ```javascript
   voice_id: 'es-ES-ElviraNeural', // Cambiar a 'en-US-JennyNeural' para inglés
   ```

### Modelo de LLM
El modelo por defecto es `meta-llama/llama-3.1-70b-instruct`. Puedes cambiarlo en:
- `streaming-client-api-ws.js`, línea ~545: `OPENROUTER_MODEL`

## 📋 Requisitos

- **Navegador**: Chrome o Edge (soporta Web Speech API)
- **Conexión**: Internet activa para OpenRouter y D-ID
- **Micrófono**: Debe estar habilitado y funcionando
- **Conexión establecida**: El avatar debe estar conectado antes de iniciar la conversación

## 🔧 Solución de Problemas

### El reconocimiento de voz no funciona
- Asegúrate de usar Chrome o Edge
- Verifica que el micrófono esté habilitado en los permisos del navegador
- Comprueba que el micrófono funcione en otras aplicaciones

### El avatar no responde
- Verifica que el estado muestre "connected" y "ready"
- Asegúrate de que la API key de D-ID esté correcta en `api.json`
- Revisa la consola del navegador para errores

### El LLM no responde
- Verifica que la API key de OpenRouter esté correcta
- Comprueba tu conexión a internet
- Revisa la consola para errores de la API

## 💡 Notas

- El sistema mantiene un historial de las últimas 20 mensajes para contexto
- El reconocimiento de voz se reinicia automáticamente después de cada frase
- Las respuestas se envían al avatar palabra por palabra para un streaming suave
- El sistema está optimizado para conversaciones naturales y fluidas

