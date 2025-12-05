# 🚀 Configuración Completa para Coolify

## 📋 Pasos para Desplegar en Coolify

### 1. Conectar Repositorio

1. Ve a **Coolify Dashboard**
2. Haz clic en **Projects** → **Create a new Application**
3. Selecciona **GitHub** como fuente
4. Conecta tu repositorio: `https://github.com/Xangel0s/avatar`
5. Branch: `main`
6. Haz clic en **Create**

### 2. Configuración de Build

Coolify detectará automáticamente el `Dockerfile`, pero verifica:

- **Build Pack**: `Dockerfile` (auto-detectado)
- **Base Directory**: `/` (raíz)
- **Dockerfile Path**: `Dockerfile` (o dejar vacío)
- **Build Command**: (dejar vacío, Dockerfile maneja todo)

### 3. ⚙️ Variables de Entorno (IMPORTANTE)

Ve a la sección **Environment Variables** y agrega **TODAS** estas variables:

#### 🔴 REQUERIDAS (Mínimo para funcionar)

```bash
DID_API_KEY=tu_email@ejemplo.com:tu_api_key_de_did
OPENROUTER_API_KEY=sk-or-v1-tu_api_key_de_openrouter
```

**Cómo obtener:**
- **D-ID**: https://studio.d-id.com/ → Settings → API Keys
- **OpenRouter**: https://openrouter.ai/ → Keys → Create Key

#### 🟡 OPCIONALES (Tienen valores por defecto)

```bash
# Servidor
PORT=3000
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=*

# D-ID
DID_SERVICE=clips

# OpenRouter - Modelos
OPENROUTER_MODEL=deepseek/deepseek-chat
OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
OPENROUTER_AUDIO_MODEL=openai/whisper

# OpenRouter - Metadata
OPENROUTER_APP_URL=https://tu-dominio.com
OPENROUTER_APP_NAME=Avatar Realtime Agent
```

**💡 Tip**: Puedes copiar todas las variables del archivo `.env.example` y pegarlas en Coolify, luego reemplazar los valores.

### 4. Configuración de Puerto

- **Port**: `3000` (o el que configuraste en `PORT`)
- **Is it a static site?**: ❌ **NO** (es una aplicación Node.js)

### 5. Deploy

1. Haz clic en **Deploy** o **Save & Deploy**
2. Coolify construirá la imagen Docker automáticamente
3. El script `generate-config.sh` generará `api.json` y `openrouter.json` desde las variables de entorno
4. La aplicación se iniciará automáticamente
5. Obtendrás una URL pública (ej: `https://avatar-xxxxx.coolify.app`)

### 6. Configuración de Dominio y SSL

**IMPORTANTE:** Para que funcione correctamente con HTTPS:

1. **Agregar dominio en Coolify:**
   - Ve a tu aplicación → Sección **Domains** o **FQDNs**
   - Agrega tu dominio: `avatar.edvio.app`
   - Asegúrate de que esté marcado como **HTTPS** (no HTTP)
   - Coolify/Traefik generará automáticamente el certificado SSL con Let's Encrypt

2. **Configurar DNS:**
   - El dominio debe apuntar a la IP pública de tu servidor Coolify
   - Tipo: `A` record
   - Valor: IP de tu servidor

3. **Actualizar variables de entorno:**
   - Cambia `OPENROUTER_APP_URL` a: `https://avatar.edvio.app`
   - Actualiza `ALLOWED_ORIGINS` a: `https://avatar.edvio.app`

4. **Esperar certificado SSL:**
   - Puede tomar 1-5 minutos para que Let's Encrypt emita el certificado
   - Verifica los logs de Traefik si hay problemas

**📖 Para más detalles sobre SSL/TLS, ver `SSL_TLS_CONFIG.md`**

### 7. Verificación

Después del despliegue, verifica:

1. ✅ Abre la URL proporcionada por Coolify (debe ser HTTPS)
2. ✅ Verifica que el candado verde aparece en el navegador
3. ✅ Ve a `/ws-streaming` (ej: `https://avatar.edvio.app/ws-streaming`)
4. ✅ El avatar debe conectarse automáticamente
5. ✅ Activa el micrófono y habla
6. ✅ Activa la cámara y verifica el análisis visual

## 🔍 Verificación de Variables

Si algo no funciona, revisa los logs en Coolify:

1. Ve a tu aplicación en Coolify
2. Haz clic en **Logs**
3. Busca mensajes como:
   - `✅ Archivos de configuración generados` - Todo bien
   - `⚠️ ADVERTENCIA: DID_API_KEY no está configurada` - Falta configurar

## 📝 Ejemplo Completo de Variables en Coolify

```
DID_API_KEY=elxapurojoo@gmail.com:zoD9EKRxacSFXOxS2D7JB
OPENROUTER_API_KEY=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
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=*
DID_SERVICE=clips
OPENROUTER_MODEL=deepseek/deepseek-chat
OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
OPENROUTER_AUDIO_MODEL=openai/whisper
OPENROUTER_APP_URL=https://avatar-xxxxx.coolify.app
OPENROUTER_APP_NAME=Avatar Realtime Agent
```

**⚠️ IMPORTANTE**: Reemplaza los valores de ejemplo con tus API keys reales.

## 🛠️ Solución de Problemas

### Error: "Cannot find module"
- Verifica que todas las dependencias estén en `package.json`
- Revisa los logs de build en Coolify

### Error: "API key not configured"
- Verifica que `DID_API_KEY` y `OPENROUTER_API_KEY` estén configuradas en Coolify
- Asegúrate de que no tengan espacios extra
- Reinicia la aplicación después de agregar variables

### Error: "CORS policy"
- Verifica `ALLOWED_ORIGINS` en Coolify
- Usa `*` para desarrollo o especifica tu dominio exacto

### El avatar no se conecta
- Revisa los logs en Coolify
- Verifica que `DID_API_KEY` tenga el formato correcto: `email:api_key`
- Asegúrate de que la URL de `OPENROUTER_APP_URL` sea la correcta

## 📚 Documentación Adicional

- **Variables detalladas**: Ver `ENV_VARIABLES.md`
- **Guía de despliegue**: Ver `DEPLOY.md`
- **Configuración local**: Ver `CONFIGURACION.md`

## ✅ Checklist Pre-Deploy

Antes de hacer deploy, verifica:

- [ ] Repositorio conectado en Coolify
- [ ] `DID_API_KEY` configurada (formato: `email:api_key`)
- [ ] `OPENROUTER_API_KEY` configurada
- [ ] `OPENROUTER_APP_URL` apunta a tu dominio de Coolify
- [ ] Puerto configurado (3000 o el que prefieras)
- [ ] `ALLOWED_ORIGINS` configurado (usar `*` para desarrollo)

¡Listo para desplegar! 🚀

