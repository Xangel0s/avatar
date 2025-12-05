# 🔒 Solución Final para SSL/TLS en Coolify

## ⚠️ Problema Actual

- **Error**: `ERR_CERT_AUTHORITY_INVALID`
- **Dominio**: `avatar.edvio.app`
- **Causa**: Certificado SSL no válido o no configurado en Coolify/Traefik

## 🔧 Solución Paso a Paso

### Paso 1: Configurar el Dominio en Coolify

1. **Ve a tu aplicación en Coolify**
2. **Sección "Domains" o "FQDNs"**
3. **Elimina** el dominio `avatar.edvio.app` si existe
4. **Agrega** el dominio nuevamente:
   - **FQDN**: `avatar.edvio.app`
   - **HTTPS**: ✅ **MARCAR** (debe estar marcado)
   - **HTTP**: ❌ Desmarcar (solo HTTPS)
5. **Guarda** los cambios

### Paso 2: Verificar Let's Encrypt en Coolify

1. **Ve a Settings** → **Traefik** en Coolify
2. **Verifica que Let's Encrypt esté habilitado:**
   - ✅ **Let's Encrypt**: Habilitado
   - ✅ **Email de contacto**: Configurado (ej: `tu-email@ejemplo.com`)
   - ✅ **Método de Challenge**: HTTP Challenge (para subdominios)
3. **Guarda** si hiciste cambios

### Paso 3: Verificar DNS

El dominio `avatar.edvio.app` debe apuntar a la IP de tu servidor Coolify:

```bash
# Verificar DNS
nslookup avatar.edvio.app
# O
dig avatar.edvio.app +short
```

**Debe mostrar la IP pública de tu servidor Coolify**

Si no apunta correctamente:
1. Ve a tu proveedor DNS (donde compraste el dominio)
2. Crea un registro **A**:
   - **Nombre**: `avatar` (o `@` si es el dominio raíz)
   - **Tipo**: A
   - **Valor**: IP de tu servidor Coolify
   - **TTL**: 3600 (o el mínimo)

### Paso 4: Verificar Puertos

Los puertos 80 y 443 deben estar abiertos en tu servidor:

```bash
# Verificar puertos
sudo ufw status
# Debe mostrar:
# 80/tcp    ALLOW
# 443/tcp   ALLOW

# Si no están abiertos:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Paso 5: Esperar Certificado SSL

Después de agregar el dominio en Coolify:

1. **Espera 1-5 minutos** para que Let's Encrypt emita el certificado
2. **Verifica los logs de Traefik** en Coolify:
   - Settings → Traefik → Logs
   - Busca mensajes sobre `acme` o `certificate`
3. **Prueba el certificado**:
   ```bash
   openssl s_client -connect avatar.edvio.app:443 -servername avatar.edvio.app
   ```

### Paso 6: Corregir Variables de Entorno

**IMPORTANTE**: Corrige estas variables en Coolify:

1. **OPENROUTER_APP_URL**:
   - ❌ **INCORRECTO**: `avatar.edvio.app`
   - ✅ **CORRECTO**: `https://avatar.edvio.app`

2. **OPENROUTER_API_KEY**:
   - ❌ **INCORRECTO**: `PORTOPENROUTER_API_KEY` (nombre mal)
   - ✅ **CORRECTO**: `OPENROUTER_API_KEY` (nombre correcto)

**Cómo corregir:**
1. Ve a tu aplicación → **Environment Variables**
2. **Elimina** `OPENROUTER_APP_URL` si tiene `avatar.edvio.app` (sin https://)
3. **Agrega** nueva variable:
   - Key: `OPENROUTER_APP_URL`
   - Value: `https://avatar.edvio.app`
4. **Elimina** `PORTOPENROUTER_API_KEY` si existe
5. **Agrega** nueva variable:
   - Key: `OPENROUTER_API_KEY`
   - Value: `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`
6. **Reinicia** la aplicación

### Paso 7: Configurar Health Check (Opcional pero Recomendado)

El health check ya está implementado en el código (`/health` endpoint).

En Coolify, puedes configurarlo:
1. Ve a tu aplicación → **Health Check**
2. **Path**: `/health`
3. **Port**: `3000`
4. **Interval**: `30` segundos
5. **Timeout**: `10` segundos
6. **Retries**: `3`

## 🧪 Verificación

### Test 1: Certificado SSL
```bash
curl -I https://avatar.edvio.app
```
Debe responder con `200 OK` y no mostrar errores de certificado.

### Test 2: Health Check
```bash
curl https://avatar.edvio.app/health
```
Debe responder: `{"status":"ok","timestamp":"...","uptime":...}`

### Test 3: Aplicación
1. Abre `https://avatar.edvio.app/ws-streaming` en modo incógnito
2. Debe mostrar el **candado verde** 🔒
3. No debe mostrar advertencias de seguridad

### Test 4: SSL Labs
1. Ve a: https://www.ssllabs.com/ssltest/analyze.html?d=avatar.edvio.app
2. Debe mostrar calificación **A** o superior
3. No debe mostrar errores críticos

## ⚠️ Si el Problema Persiste

### Error: "ERR_CERT_AUTHORITY_INVALID"

**Posibles causas:**
1. Certificado no emitido por Let's Encrypt
2. Certificado autofirmado
3. Problema con la cadena de certificados
4. DNS no apunta correctamente

**Solución:**
1. Elimina el dominio en Coolify
2. Espera 1 minuto
3. Vuelve a agregarlo como HTTPS
4. Espera 5 minutos
5. Verifica los logs de Traefik

### Error: "HSTS" (HTTP Strict Transport Security)

**Causa**: El dominio fue marcado como HSTS pero el certificado es inválido

**Solución:**
1. Limpia la caché del navegador completamente
2. Usa modo incógnito para probar
3. Espera 24 horas (HSTS se cachea en el navegador)
4. O prueba desde otro navegador/dispositivo

### El Certificado No Se Genera

**Verifica:**
1. ✅ DNS apunta correctamente a tu servidor
2. ✅ Puertos 80 y 443 están abiertos
3. ✅ Let's Encrypt está habilitado en Coolify
4. ✅ Email de contacto configurado
5. ✅ No hay rate limits de Let's Encrypt (máximo 5 certificados por semana por dominio)

**Si todo está correcto pero no funciona:**
1. Verifica los logs de Traefik en Coolify
2. Busca errores relacionados con `acme`, `certificate`, `challenge`
3. Si hay errores, cópialos y busca la solución en la documentación de Coolify

## 📋 Checklist Final

Antes de reportar problemas, verifica:

- [ ] Dominio agregado en Coolify con **HTTPS habilitado**
- [ ] DNS apunta correctamente a la IP del servidor
- [ ] Puertos 80 y 443 están abiertos
- [ ] Let's Encrypt está habilitado en Coolify
- [ ] Email de contacto configurado en Traefik
- [ ] `OPENROUTER_APP_URL` tiene el valor `https://avatar.edvio.app` (con https://)
- [ ] `OPENROUTER_API_KEY` existe (no `PORTOPENROUTER_API_KEY`)
- [ ] La aplicación se reinició después de corregir variables
- [ ] Esperaste 5 minutos después de agregar el dominio
- [ ] Logs de Traefik no muestran errores críticos
- [ ] Certificado aparece como válido en SSL Labs

## ✅ Después de Configurar Correctamente

Una vez que el SSL esté funcionando:

1. ✅ El candado verde aparece en el navegador
2. ✅ `https://avatar.edvio.app` carga sin errores
3. ✅ `https://avatar.edvio.app/ws-streaming` funciona
4. ✅ `https://avatar.edvio.app/health` responde correctamente
5. ✅ No hay advertencias de seguridad

## 📚 Referencias

- [Documentación de Coolify - SSL/TLS](https://coolify.io/docs/knowledge-base/proxy/traefik/overview)
- [Documentación de Traefik - Let's Encrypt](https://doc.traefik.io/traefik/https/acme/)
- `VERIFICACION_SSL.md` - Verificación completa del código
- `CORRECCION_VARIABLES.md` - Corrección de variables de entorno

