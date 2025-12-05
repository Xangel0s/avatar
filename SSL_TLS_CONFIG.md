# 🔒 Configuración SSL/TLS para Coolify con Traefik

## Problema: ERR_CERT_AUTHORITY_INVALID

Si ves el error `ERR_CERT_AUTHORITY_INVALID` o "La conexión no es privada", significa que hay un problema con el certificado SSL. Esta guía te ayudará a solucionarlo.

## ✅ Verificación y Configuración en Coolify

### 1. Verificar Configuración del Dominio

En Coolify, verifica que:

1. **Dominio configurado correctamente:**
   - Ve a tu aplicación en Coolify
   - Sección **Domains** o **FQDNs**
   - Asegúrate de que `avatar.edvio.app` esté agregado
   - Debe estar marcado como **HTTPS** (no HTTP)

2. **DNS configurado:**
   - El dominio `avatar.edvio.app` debe apuntar a la IP de tu servidor Coolify
   - Verifica con: `nslookup avatar.edvio.app` o `dig avatar.edvio.app`
   - Debe apuntar a la IP pública de tu servidor

### 2. Configuración de Traefik en Coolify

Coolify usa Traefik automáticamente. Verifica:

1. **Let's Encrypt habilitado:**
   - Ve a **Settings** → **Traefik** en Coolify
   - Asegúrate de que **Let's Encrypt** esté habilitado
   - Verifica que el email de contacto esté configurado

2. **Método de Challenge:**
   - **HTTP Challenge** (recomendado para subdominios):
     - Requiere que el puerto 80 esté accesible
     - El dominio debe apuntar a tu IP
   - **DNS Challenge** (para wildcards):
     - Requiere configuración DNS adicional
     - Útil para `*.edvio.app`

### 3. Forzar Renovación del Certificado

Si el certificado está inválido:

1. En Coolify, ve a tu aplicación
2. Sección **Domains**
3. Elimina el dominio `avatar.edvio.app`
4. Vuelve a agregarlo
5. Coolify solicitará un nuevo certificado automáticamente

### 4. Verificar Puertos

Asegúrate de que los puertos estén abiertos:

```bash
# Verificar que los puertos 80 y 443 estén abiertos
sudo ufw status
# O
sudo iptables -L -n | grep -E '80|443'
```

Si no están abiertos:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### 5. Verificar Logs de Traefik

En Coolify:

1. Ve a **Settings** → **Traefik**
2. Haz clic en **Logs**
3. Busca errores relacionados con:
   - `acme`
   - `certificate`
   - `Let's Encrypt`
   - `challenge`

## 🔧 Configuración de la Aplicación

### Variables de Entorno Importantes

Asegúrate de que estas variables estén configuradas:

```bash
# URL debe ser HTTPS
OPENROUTER_APP_URL=https://avatar.edvio.app

# CORS debe incluir el dominio HTTPS
ALLOWED_ORIGINS=https://avatar.edvio.app,https://www.avatar.edvio.app
```

### Verificar que la Aplicación Use HTTPS

El código debe estar preparado para HTTPS. Verifica:

1. **WebSockets deben usar WSS (no WS):**
   - El código ya maneja esto automáticamente
   - Si la página es HTTPS, los WebSockets serán WSS

2. **Recursos externos:**
   - Todos los recursos (imágenes, scripts) deben cargarse por HTTPS
   - Verifica que no haya recursos mixtos (HTTP en página HTTPS)

## 🛠️ Solución de Problemas

### Error: "ERR_CERT_AUTHORITY_INVALID"

**Causas posibles:**
1. Certificado no válido o expirado
2. Certificado no emitido por una CA confiable
3. Certificado autofirmado
4. Problema con la cadena de certificados

**Solución:**
1. Elimina y vuelve a agregar el dominio en Coolify
2. Espera 1-2 minutos para que Let's Encrypt emita el certificado
3. Verifica los logs de Traefik
4. Si persiste, verifica la configuración DNS

### Error: "HSTS" (HTTP Strict Transport Security)

**Causa:**
- El dominio fue marcado como HSTS pero el certificado es inválido

**Solución:**
1. Limpia la caché del navegador
2. Usa modo incógnito para probar
3. Verifica que el certificado sea válido en otro navegador
4. Si el problema persiste, espera 24 horas (HSTS se cachea)

### El Certificado No Se Genera

**Verifica:**
1. DNS apunta correctamente a tu servidor
2. Puertos 80 y 443 están abiertos
3. Let's Encrypt está habilitado en Coolify
4. Email de contacto configurado en Traefik
5. No hay rate limits de Let's Encrypt (máximo 5 certificados por semana por dominio)

## 📋 Checklist de Verificación SSL

Antes de reportar problemas, verifica:

- [ ] Dominio agregado en Coolify con HTTPS habilitado
- [ ] DNS apunta correctamente a la IP del servidor
- [ ] Puertos 80 y 443 están abiertos en el firewall
- [ ] Let's Encrypt está habilitado en Coolify
- [ ] Email de contacto configurado en Traefik
- [ ] `OPENROUTER_APP_URL` usa HTTPS
- [ ] `ALLOWED_ORIGINS` incluye el dominio HTTPS
- [ ] Logs de Traefik no muestran errores críticos
- [ ] Certificado aparece como válido en otro navegador/dispositivo

## 🔍 Comandos Útiles para Diagnóstico

```bash
# Verificar DNS
nslookup avatar.edvio.app
dig avatar.edvio.app

# Verificar certificado SSL
openssl s_client -connect avatar.edvio.app:443 -servername avatar.edvio.app

# Verificar desde navegador
# Abre: https://www.ssllabs.com/ssltest/analyze.html?d=avatar.edvio.app
```

## 📚 Referencias

- [Documentación de Coolify - Traefik](https://coolify.io/docs/knowledge-base/proxy/traefik/overview)
- [Documentación de Traefik - Let's Encrypt](https://doc.traefik.io/traefik/https/acme/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)

## ⚠️ Notas Importantes

1. **Primera vez:** Puede tomar 1-5 minutos para que Let's Encrypt emita el certificado
2. **Renovación:** Los certificados se renuevan automáticamente cada 60 días
3. **Rate Limits:** Let's Encrypt tiene límites de 5 certificados por semana por dominio
4. **Wildcards:** Requieren DNS Challenge, no HTTP Challenge
5. **HSTS:** Una vez que un dominio tiene HSTS, el navegador lo cachea por 24 horas

## ✅ Después de Configurar

Una vez que el SSL esté funcionando:

1. Verifica que `https://avatar.edvio.app` carga sin errores
2. Verifica que `https://avatar.edvio.app/ws-streaming` funciona
3. Verifica que el candado verde aparece en el navegador
4. Actualiza `OPENROUTER_APP_URL` a `https://avatar.edvio.app` en Coolify

