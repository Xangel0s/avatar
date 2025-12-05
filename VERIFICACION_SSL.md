# ✅ Verificación SSL/TLS - Checklist Completo

## 🔍 Problema Actual
- Error: `ERR_CERT_AUTHORITY_INVALID`
- Dominio: `avatar.edvio.app`
- Causa: Certificado SSL no válido o no configurado correctamente en Coolify/Traefik

## ✅ Verificaciones Realizadas en el Código

### 1. WebSockets ✅
- **Estado**: Configurado correctamente
- **Ubicación**: `streaming-client-api-ws.js` línea 668-684
- **Detalles**: 
  - Usa `wss://ws-api.d-id.com` (WSS para HTTPS)
  - El WebSocket se conecta automáticamente con el protocolo correcto
  - No requiere cambios

### 2. Recursos Externos ✅
- **Estado**: Todos usan HTTPS
- **CDNs verificados**:
  - ✅ Tailwind CSS: `https://cdn.tailwindcss.com`
  - ✅ TensorFlow.js: `https://cdn.jsdelivr.net`
  - ✅ Google Fonts: `https://fonts.googleapis.com`
  - ✅ Material Symbols: `https://fonts.googleapis.com`
  - ✅ OpenRouter API: `https://openrouter.ai`
  - ✅ D-ID API: `https://api.d-id.com` y `wss://ws-api.d-id.com`

### 3. Headers de Seguridad ✅
- **Estado**: Configurado en `app.js`
- **Headers implementados**:
  - ✅ `Strict-Transport-Security` (HSTS)
  - ✅ `X-Content-Type-Options: nosniff`
  - ✅ `X-Frame-Options: SAMEORIGIN`
  - ✅ `X-XSS-Protection: 1; mode=block`

### 4. CORS ✅
- **Estado**: Configurado para HTTPS
- **Ubicación**: `app.js` línea 26-31
- **Detalles**: Soporta múltiples orígenes HTTPS

### 5. Variables de Entorno ✅
- **Estado**: Configurado para producción
- **Variables requeridas**:
  - ✅ `OPENROUTER_APP_URL=https://avatar.edvio.app`
  - ✅ `ALLOWED_ORIGINS=https://avatar.edvio.app`

## 🔧 Acciones Requeridas en Coolify

### Paso 1: Verificar Dominio en Coolify
1. Ve a tu aplicación en Coolify
2. Sección **Domains** o **FQDNs**
3. Verifica que `avatar.edvio.app` esté agregado
4. **IMPORTANTE**: Debe estar marcado como **HTTPS** (no HTTP)

### Paso 2: Verificar DNS
```bash
# Verificar que el DNS apunta correctamente
nslookup avatar.edvio.app
# O
dig avatar.edvio.app

# Debe apuntar a la IP de tu servidor Coolify
```

### Paso 3: Verificar Let's Encrypt
1. En Coolify: **Settings** → **Traefik**
2. Verifica que **Let's Encrypt** esté habilitado
3. Verifica que el email de contacto esté configurado
4. Verifica que el método de challenge sea **HTTP Challenge** (para subdominios)

### Paso 4: Forzar Renovación del Certificado
1. En Coolify, ve a tu aplicación
2. Sección **Domains**
3. **Elimina** el dominio `avatar.edvio.app`
4. **Vuelve a agregarlo** como HTTPS
5. Espera 1-5 minutos para que Let's Encrypt emita el certificado

### Paso 5: Verificar Puertos
```bash
# Verificar que los puertos estén abiertos
sudo ufw status
# Debe mostrar:
# 80/tcp    ALLOW
# 443/tcp   ALLOW

# Si no están abiertos:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Paso 6: Verificar Logs de Traefik
1. En Coolify: **Settings** → **Traefik** → **Logs**
2. Busca errores relacionados con:
   - `acme`
   - `certificate`
   - `Let's Encrypt`
   - `challenge`
3. Si hay errores, cópialos y busca la solución

### Paso 7: Actualizar Variables de Entorno
En Coolify, actualiza estas variables:

```bash
OPENROUTER_APP_URL=https://avatar.edvio.app
ALLOWED_ORIGINS=https://avatar.edvio.app
```

## 🧪 Pruebas de Verificación

### Test 1: Verificar Certificado SSL
```bash
openssl s_client -connect avatar.edvio.app:443 -servername avatar.edvio.app
```

**Resultado esperado:**
- Debe mostrar un certificado válido
- Debe mostrar "Verify return code: 0 (ok)"

### Test 2: Verificar desde Navegador
1. Abre `https://avatar.edvio.app` en modo incógnito
2. Debe mostrar el **candado verde** 🔒
3. No debe mostrar advertencias de seguridad

### Test 3: Verificar SSL Labs
1. Ve a: https://www.ssllabs.com/ssltest/analyze.html?d=avatar.edvio.app
2. Debe mostrar calificación **A** o superior
3. No debe mostrar errores críticos

### Test 4: Verificar HSTS
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña **Network**
3. Recarga la página
4. Verifica que el header `Strict-Transport-Security` esté presente

## ⚠️ Solución de Problemas Específicos

### Error: "ERR_CERT_AUTHORITY_INVALID"
**Causa**: Certificado no válido o no emitido por Let's Encrypt

**Solución**:
1. Elimina y vuelve a agregar el dominio en Coolify
2. Espera 1-5 minutos
3. Verifica los logs de Traefik
4. Verifica que DNS apunte correctamente

### Error: "HSTS" (HTTP Strict Transport Security)
**Causa**: El dominio fue marcado como HSTS pero el certificado es inválido

**Solución**:
1. Limpia la caché del navegador
2. Usa modo incógnito
3. Espera 24 horas (HSTS se cachea)
4. Verifica que el certificado sea válido

### El Certificado No Se Genera
**Verifica**:
1. ✅ DNS apunta correctamente
2. ✅ Puertos 80 y 443 están abiertos
3. ✅ Let's Encrypt está habilitado
4. ✅ Email de contacto configurado
5. ✅ No hay rate limits de Let's Encrypt (máximo 5 por semana)

## 📋 Checklist Final

Antes de reportar problemas, verifica:

- [ ] Dominio agregado en Coolify con HTTPS habilitado
- [ ] DNS apunta correctamente a la IP del servidor
- [ ] Puertos 80 y 443 están abiertos
- [ ] Let's Encrypt está habilitado en Coolify
- [ ] Email de contacto configurado en Traefik
- [ ] `OPENROUTER_APP_URL` usa HTTPS
- [ ] `ALLOWED_ORIGINS` incluye el dominio HTTPS
- [ ] Logs de Traefik no muestran errores críticos
- [ ] Certificado aparece como válido en SSL Labs
- [ ] El candado verde aparece en el navegador

## ✅ Estado del Código

**Todo el código está validado y listo para HTTPS:**
- ✅ WebSockets usan WSS
- ✅ Todos los recursos externos usan HTTPS
- ✅ Headers de seguridad configurados
- ✅ CORS configurado para HTTPS
- ✅ Variables de entorno preparadas

**El problema es de configuración en Coolify/Traefik, no del código.**

## 📚 Documentación Relacionada

- `SSL_TLS_CONFIG.md` - Guía completa de configuración SSL/TLS
- `COOLIFY_SETUP.md` - Guía de despliegue en Coolify
- `ENV_VARIABLES.md` - Variables de entorno

## 🆘 Si el Problema Persiste

1. Verifica los logs de Traefik en Coolify
2. Verifica que el dominio esté correctamente configurado
3. Prueba desde otro navegador/dispositivo
4. Verifica que no haya problemas de red/firewall
5. Contacta al soporte de Coolify si es necesario

