# 🔧 Solución: EntryPoint doesn't exist en Traefik

## ⚠️ Problema

Error en logs de Traefik:
```
ERR EntryPoint doesn't exist entryPointName=websecure routerName=avatar@docker
ERR EntryPoint doesn't exist entryPointName=web routerName=avatar-http@docker
```

**Causa**: Traefik en Coolify no tiene los entrypoints `web` y `websecure` configurados, o usa nombres diferentes.

## ✅ Solución: Dejar que Coolify Configure Automáticamente

En Coolify, **NO necesitas configurar las labels de Traefik manualmente**. Coolify gestiona Traefik automáticamente cuando agregas un dominio en la interfaz.

### Paso 1: Remover Labels de Traefik del docker-compose.yml

Ya se han comentado las labels de Traefik en `docker-compose.yml`. Esto permite que Coolify configure Traefik automáticamente.

### Paso 2: Agregar Dominio en Coolify

1. Ve a tu aplicación en Coolify
2. Sección **"Domains"** o **"FQDNs"**
3. Haz clic en **"Add Domain"** o **"Add FQDN"**
4. Ingresa: `avatar.edvio.app`
5. Selecciona **HTTPS** (no HTTP)
6. Guarda

### Paso 3: Verificar Puerto

1. En la misma sección de **Domains**
2. Verifica que el puerto sea **3000** (el puerto de tu aplicación)
3. Si no está configurado, agrégalo

### Paso 4: Redeploy

1. Haz clic en **"Redeploy"** o **"Restart"**
2. Espera 30-60 segundos
3. Prueba `https://avatar.edvio.app`

## 🔍 Verificación

### Verificar que Coolify Configuró el Dominio

En los logs de Traefik, deberías ver:
```
✅ Found service avatar
✅ Router avatar configured
```

**NO deberías ver:**
```
❌ EntryPoint doesn't exist
❌ No valid entryPoint
```

### Verificar que el Dominio Funciona

```bash
curl -I https://avatar.edvio.app
```

**Debe responder:**
```
HTTP/1.1 200 OK
```

Sin errores de certificado.

## 🛠️ Alternativa: Usar Labels Manuales (Solo si es Necesario)

Si necesitas usar labels manuales, primero debes verificar qué entrypoints tiene Traefik:

### Paso 1: Verificar Entrypoints de Traefik

En el servidor, ejecuta:
```bash
docker exec coolify-proxy wget -qO- http://localhost:8080/api/entrypoints
```

O verifica la configuración:
```bash
docker exec coolify-proxy cat /etc/traefik/traefik.yml
```

### Paso 2: Ajustar Labels Según los Entrypoints Encontrados

Una vez que sepas los nombres de los entrypoints, ajusta las labels en `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.avatar.rule=Host(`avatar.edvio.app`)"
  - "traefik.http.routers.avatar.entrypoints=ENTRYPOINT_HTTPS"  # Reemplazar con el nombre real
  - "traefik.http.routers.avatar.tls=true"
  - "traefik.http.routers.avatar.tls.certresolver=letsencrypt"
  - "traefik.http.services.avatar.loadbalancer.server.port=3000"
```

### Paso 3: Redeploy

1. Haz clic en **"Redeploy"**
2. Espera 30-60 segundos
3. Verifica los logs de Traefik

## 📋 Checklist

- [ ] Labels de Traefik comentadas en `docker-compose.yml`
- [ ] Dominio `avatar.edvio.app` agregado en Coolify (sección Domains)
- [ ] Dominio configurado con **HTTPS** (no HTTP)
- [ ] Puerto configurado como **3000**
- [ ] Aplicación redeployada
- [ ] Logs de Traefik no muestran errores de entrypoints
- [ ] `https://avatar.edvio.app` carga correctamente

## ⚠️ Notas Importantes

1. **Coolify gestiona Traefik automáticamente**: No necesitas configurar labels manualmente a menos que tengas un caso especial.

2. **El dominio debe estar en Coolify**: Aunque las labels especifican el dominio, también debe estar en la sección Domains de Coolify para que funcione correctamente.

3. **Puerto debe coincidir**: El puerto configurado en Coolify (sección Domains) debe coincidir con el puerto de tu aplicación (3000).

4. **SSL automático**: Coolify solicitará automáticamente un certificado SSL de Let's Encrypt cuando agregues el dominio con HTTPS.

## ✅ Después de Corregir

Una vez corregido:

1. ✅ El dominio `avatar.edvio.app` debe estar en Coolify (sección Domains)
2. ✅ Los logs de Traefik no deben mostrar errores de entrypoints
3. ✅ `https://avatar.edvio.app` debe cargar correctamente
4. ✅ El certificado SSL debe estar activo (candado verde 🔒)

## 📚 Referencias

- `docker-compose.yml` - Labels comentadas para permitir configuración automática
- `VERIFICAR_ENTRYPOINTS.sh` - Script para verificar entrypoints de Traefik
- `COOLIFY_SETUP.md` - Guía completa de configuración en Coolify

