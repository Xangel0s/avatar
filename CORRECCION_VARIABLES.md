# ⚠️ Corrección de Variables de Entorno en Coolify

## Problemas Detectados en el Deployment

Después de revisar los logs del deployment, se detectaron los siguientes problemas:

### 1. ❌ OPENROUTER_APP_URL sin protocolo HTTPS

**Problema detectado:**
```
OPENROUTER_APP_URL=avatar.edvio.app
```

**Debe ser:**
```
OPENROUTER_APP_URL=https://avatar.edvio.app
```

**Por qué es importante:**
- OpenRouter requiere el protocolo completo (https://) en el header HTTP-Referer
- Sin el protocolo, puede causar errores en las llamadas a la API

### 2. ❌ Variable OPENROUTER_API_KEY mal nombrada

**Problema detectado:**
```
PORTOPENROUTER_API_KEY=sk-or-v1-...
```

**Debe ser:**
```
OPENROUTER_API_KEY=sk-or-v1-...
```

**Por qué es importante:**
- El código busca `OPENROUTER_API_KEY`, no `PORTOPENROUTER_API_KEY`
- Sin la variable correcta, la aplicación no podrá hacer llamadas a OpenRouter

## 🔧 Cómo Corregir en Coolify

### Paso 1: Ir a Variables de Entorno

1. Ve a tu aplicación en Coolify
2. Haz clic en **Environment Variables** o **Variables de Entorno**

### Paso 2: Corregir OPENROUTER_APP_URL

1. Busca la variable `OPENROUTER_APP_URL`
2. **Elimina** la variable actual si tiene el valor `avatar.edvio.app` (sin https://)
3. **Agrega** una nueva variable:
   - **Key**: `OPENROUTER_APP_URL`
   - **Value**: `https://avatar.edvio.app`
   - Haz clic en **Add** o **Save**

### Paso 3: Corregir OPENROUTER_API_KEY

1. Busca la variable `PORTOPENROUTER_API_KEY` (si existe)
2. **Elimina** esa variable
3. **Agrega** una nueva variable:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: `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`
   - Haz clic en **Add** o **Save**

### Paso 4: Verificar Todas las Variables

Asegúrate de que estas variables estén correctamente configuradas:

```bash
# REQUERIDAS
DID_API_KEY=ZWxwYXB1cm9qb29AZ21haWwuY29t:zoD9EKRxacSFXOxS2D7JB
OPENROUTER_API_KEY=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

# OPCIONALES (pero recomendadas)
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=*
DID_SERVICE=clips
OPENROUTER_MODEL=deepseek/deepseek-chat
OPENROUTER_VISION_MODEL=openai/gpt-4o-mini
OPENROUTER_AUDIO_MODEL=openai/whisper
OPENROUTER_APP_URL=https://avatar.edvio.app  ⚠️ IMPORTANTE: con https://
OPENROUTER_APP_NAME=Avatar Realtime Agent
```

### Paso 5: Reiniciar la Aplicación

Después de corregir las variables:

1. Haz clic en **Restart** o **Redeploy**
2. Espera a que el contenedor se reinicie
3. Verifica los logs para asegurarte de que no hay errores

## ✅ Verificación Post-Corrección

Después de corregir las variables, verifica:

1. **Health Check:**
   ```bash
   curl https://avatar.edvio.app/health
   ```
   Debe responder: `{"status":"ok","timestamp":"...","uptime":...}`

2. **Aplicación carga:**
   - Abre `https://avatar.edvio.app/ws-streaming`
   - Debe cargar sin errores en la consola

3. **Logs de la aplicación:**
   - En Coolify, ve a **Logs**
   - Busca mensajes como:
     - `✅ Archivos de configuración generados`
     - `Server started on port...`
     - No debe haber errores sobre `OPENROUTER_API_KEY` o `OPENROUTER_APP_URL`

## 📋 Checklist de Verificación

- [ ] `OPENROUTER_APP_URL` tiene el valor `https://avatar.edvio.app` (con https://)
- [ ] `OPENROUTER_API_KEY` existe (no `PORTOPENROUTER_API_KEY`)
- [ ] `DID_API_KEY` está configurada
- [ ] Todas las variables tienen nombres correctos (sin espacios extra)
- [ ] La aplicación se reinició después de los cambios
- [ ] El health check responde correctamente
- [ ] La aplicación carga sin errores

## 🆘 Si Persisten Problemas

1. **Verifica los logs en Coolify:**
   - Ve a tu aplicación → **Logs**
   - Busca errores relacionados con variables de entorno

2. **Verifica que las variables se aplicaron:**
   - En Coolify, ve a **Environment Variables**
   - Confirma que los valores son correctos

3. **Revisa el script de generación:**
   - El script `generate-config.sh` genera `api.json` y `openrouter.json`
   - Verifica en los logs que se ejecutó correctamente

## 📚 Referencias

- `VARIABLES_COOLIFY.txt` - Lista completa de variables
- `ENV_VARIABLES.md` - Documentación detallada de cada variable
- `COOLIFY_SETUP.md` - Guía completa de configuración

