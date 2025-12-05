# 📷 Cámara y Análisis Visual

## ✅ Funcionalidad Implementada

Se ha agregado la capacidad de que el avatar pueda **ver y analizar el entorno** del usuario mediante:

1. **Captura de Video** - Acceso a la cámara del usuario
2. **Análisis Visual en Tiempo Real** - El LLM analiza lo que ve la cámara
3. **Integración con Conversación** - El avatar puede responder basándose en lo que ve
4. **Análisis Periódico** - El entorno se analiza automáticamente cada 5 segundos

## 🚀 Cómo Usar

### Activar la Cámara

1. **Haz clic en "📷 Activar Cámara"**
   - El navegador pedirá permiso para acceder a la cámara
   - Se mostrará una ventana pequeña con tu cámara en la esquina superior derecha
   - El borde verde indica que la cámara está activa

### Conversación con Análisis Visual

1. **Activa la cámara** (paso anterior)
2. **Conecta con el avatar** (botón "Connect")
3. **Inicia la conversación** (botón "🎤 Iniciar Conversación")
4. **Habla con el avatar** - El avatar ahora puede:
   - Ver tu entorno en tiempo real
   - Analizar objetos, personas, colores, iluminación
   - Responder basándose en lo que ve
   - Hacer comentarios sobre tu entorno

### Análisis Visual Automático

- El sistema analiza automáticamente el entorno cada **5 segundos**
- Los análisis se muestran en la sección "📷 Análisis Visual"
- El avatar usa esta información para dar respuestas más contextuales

### Detener la Cámara

- Haz clic en **"⏹ Detener"** en la ventana de la cámara
- O haz clic en **"📷 Activar Cámara"** nuevamente (se ocultará el botón de detener)

## 🎯 Características

### Análisis en Tiempo Real
- Captura frames de video cada 5 segundos
- Convierte imágenes a formato base64
- Envía al modelo de visión (GPT-4o-mini)
- Obtiene descripción detallada del entorno

### Integración con Conversación
- Cuando hablas, el avatar analiza el entorno actual
- Incorpora información visual en sus respuestas
- Puede hacer comentarios sobre lo que ve
- Responde de manera contextual y relevante

### Optimización
- Imágenes comprimidas (70% calidad JPEG)
- Análisis solo cuando la conversación está activa
- Intervalo configurable (5 segundos por defecto)

## ⚙️ Configuración

### Modelo de Visión
El modelo por defecto es `openai/gpt-4o-mini`. Puedes cambiarlo en:
- `streaming-client-api-ws.js`, línea ~548: `OPENROUTER_VISION_MODEL`

### Intervalo de Análisis
Para cambiar la frecuencia de análisis:
- `streaming-client-api-ws.js`, línea ~552: `ANALYSIS_INTERVAL` (en milisegundos)

### Resolución de Cámara
Para cambiar la resolución de captura:
- `streaming-client-api-ws.js`, línea ~848-849: `width` y `height` en `getUserMedia`

## 📋 Requisitos

- **Navegador**: Chrome o Edge (soporta getUserMedia)
- **Cámara**: Webcam funcionando
- **Permisos**: Acceso a la cámara habilitado
- **Conexión**: Internet activa para OpenRouter

## 🔧 Solución de Problemas

### La cámara no se activa
- Verifica que el navegador tenga permisos para acceder a la cámara
- Asegúrate de que no haya otra aplicación usando la cámara
- Prueba en otro navegador

### El análisis visual no funciona
- Verifica que la cámara esté activa y mostrando video
- Comprueba la consola del navegador para errores
- Asegúrate de que la API key de OpenRouter sea válida
- Verifica que el modelo de visión esté disponible

### El avatar no menciona lo que ve
- El análisis visual se incorpora automáticamente en las respuestas
- Haz preguntas específicas sobre el entorno para mejores resultados
- El análisis se actualiza cada 5 segundos

## 💡 Ejemplos de Uso

### Preguntas que puedes hacer:
- "¿Qué ves en mi entorno?"
- "¿Qué objetos hay alrededor?"
- "¿Cómo está la iluminación?"
- "¿Hay alguien más en la habitación?"
- "Describe lo que ves"

### El avatar puede:
- Describir objetos y personas
- Comentar sobre la iluminación y colores
- Hacer observaciones sobre el ambiente
- Responder preguntas específicas sobre lo que ve

## 🔒 Privacidad

- El video se procesa localmente antes de enviarse
- Solo se envían frames individuales, no video continuo
- Las imágenes se comprimen para optimizar el análisis
- Puedes detener la cámara en cualquier momento

