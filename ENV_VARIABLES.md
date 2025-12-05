# 🔐 Variables de Entorno para Coolify

## Variables Requeridas

### D-ID API (Requerida)
```bash
DID_API_KEY=tu_api_key_de_did
```
- **Descripción**: API key de D-ID para el servicio de streaming en vivo
- **Obtener**: https://studio.d-id.com/
- **Formato**: `email:api_key` (ejemplo: `usuario@email.com:abc123xyz`)

### OpenRouter API (Requerida)
```bash
OPENROUTER_API_KEY=sk-or-v1-tu_api_key_aqui
```
- **Descripción**: API key de OpenRouter para el servicio de IA
- **Obtener**: https://openrouter.ai/
- **Formato**: `sk-or-v1-...`

## Variables Opcionales

### Configuración del Servidor
```bash
PORT=3000
```
- **Descripción**: Puerto en el que correrá el servidor
- **Valor por defecto**: `3000`
- **Recomendado**: Dejar el valor por defecto o usar el que Coolify asigne automáticamente

```bash
NODE_ENV=production
```
- **Descripción**: Entorno de ejecución
- **Valor por defecto**: `production` (en Dockerfile)
- **Recomendado**: No cambiar, dejar `production`

### CORS (Seguridad)
```bash
ALLOWED_ORIGINS=*
```
- **Descripción**: Orígenes permitidos para CORS (separados por comas)
- **Valor por defecto**: `*` (todos los orígenes)
- **Recomendado para producción**: Especificar dominios exactos separados por comas
- **Ejemplo**: `https://tudominio.com,https://www.tudominio.com`

### OpenRouter - Modelos de IA (Opcionales)
```bash
OPENROUTER_MODEL=deepseek/deepseek-chat
```
- **Descripción**: Modelo de IA para conversación de texto
- **Valor por defecto**: `deepseek/deepseek-chat`
- **Alternativas**: `meta-llama/llama-3.1-70b-instruct`, `openai/gpt-4o-mini`, etc.

```bash
OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
```
- **Descripción**: Modelo de IA con capacidad de visión para análisis visual
- **Valor por defecto**: `openai/gpt-4o-mini`
- **Alternativas**: `openai/gpt-4o`, `anthropic/claude-3-opus`, etc.

```bash
OPENROUTER_AUDIO_MODEL=openai/whisper
```
- **Descripción**: Modelo para transcripción de audio (actualmente no usado)
- **Valor por defecto**: `openai/whisper`

```bash
OPENROUTER_APP_URL=https://tu-dominio.com
```
- **Descripción**: URL de tu aplicación para OpenRouter (usado en headers HTTP-Referer)
- **Valor por defecto**: `http://localhost:3000`
- **Recomendado**: Cambiar a la URL de producción de Coolify

```bash
OPENROUTER_APP_NAME=Avatar Realtime Agent
```
- **Descripción**: Nombre de la aplicación para OpenRouter (usado en headers X-Title)
- **Valor por defecto**: `Avatar Realtime Agent`
- **Opcional**: Personalizar con el nombre de tu aplicación

### D-ID - Configuración del Servicio (Opcional)
```bash
DID_SERVICE=clips
```
- **Descripción**: Tipo de servicio D-ID a usar
- **Valor por defecto**: `clips`
- **Opciones**: `clips` o `talks`

## 📋 Configuración Mínima en Coolify

Para que la aplicación funcione, necesitas configurar **mínimo** estas variables:

1. ✅ `DID_API_KEY` - **REQUERIDA**
2. ✅ `OPENROUTER_API_KEY` - **REQUERIDA**

Las demás variables son opcionales y usarán valores por defecto.

## 🔧 Cómo Configurar en Coolify

1. Ve a tu aplicación en Coolify
2. Haz clic en **Environment Variables** (Variables de Entorno)
3. Agrega cada variable con su valor:
   - **Key**: `DID_API_KEY`
   - **Value**: `tu_api_key_de_did`
   - Haz clic en **Add**
4. Repite para todas las variables que necesites
5. Haz clic en **Save**
6. Reinicia la aplicación (Coolify lo hará automáticamente al guardar)

## ⚠️ Notas Importantes

- **NUNCA** subas tus API keys al repositorio
- Las variables de entorno son **secretas** y solo se ven en Coolify
- Si cambias una variable, la aplicación se reiniciará automáticamente
- Los archivos `api.json` y `openrouter.json` se generan automáticamente desde las variables de entorno al iniciar el contenedor

## 🔍 Verificación

Después de configurar las variables, verifica que todo funcione:

1. La aplicación debe cargar sin errores
2. El avatar debe conectarse correctamente
3. El reconocimiento de voz debe funcionar
4. El análisis visual debe funcionar

Si hay errores, revisa los logs en Coolify para ver qué variable falta o está mal configurada.

