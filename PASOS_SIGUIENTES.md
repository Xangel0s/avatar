# 🚀 Pasos Siguientes: Resolver Error 503

## 📋 Estado Actual

✅ **Completado:**
- Labels de Traefik comentadas en `docker-compose.yml`
- Servidor configurado para escuchar en `0.0.0.0:3000`
- Health check implementado en `/health`
- Contenedor está `(healthy)`

❌ **Pendiente:**
- Traefik no puede enrutar porque no hay entrypoints `web` y `websecure`
- Dominio no configurado en Coolify (o mal configurado)

## 🎯 Solución: Configurar Dominio en Coolify

### Paso 1: Verificar Estado Actual en Coolify

1. **Abre Coolify** en tu navegador
2. Ve a tu aplicación **"avatar"**
3. Busca la sección **"Domains"**, **"FQDNs"** o **"Domain Configuration"**
4. Verifica si `avatar.edvio.app` está listado

### Paso 2: Agregar o Corregir Dominio

#### Si el dominio NO existe:

1. Haz clic en **"Add Domain"**, **"Add FQDN"** o **"Add New Domain"**
2. Ingresa: `avatar.edvio.app`
3. Selecciona **HTTPS** (no HTTP)
4. Verifica que el puerto sea **3000**
5. Guarda

#### Si el dominio YA existe:

1. Haz clic en el dominio `avatar.edvio.app`
2. Verifica que:
   - ✅ Esté marcado como **HTTPS** (no HTTP)
   - ✅ El puerto sea **3000**
   - ✅ El estado sea **Active** o **Enabled**
3. Si está en HTTP, cámbialo a HTTPS
4. Guarda los cambios

### Paso 3: Redeploy la Aplicación

1. En Coolify, ve a tu aplicación
2. Haz clic en **"Redeploy"**, **"Restart"** o **"Deploy"**
3. Espera 30-60 segundos
4. Verifica los logs para confirmar que el servidor inició

### Paso 4: Verificar en el Servidor

Ejecuta estos comandos en el servidor para verificar:

```bash
# 1. Verificar que el contenedor esté corriendo
docker ps | grep avatar

# 2. Verificar logs del contenedor
docker logs $(docker ps | grep avatar | awk '{print $1}') --tail 20

# 3. Verificar que el servidor esté escuchando
docker exec $(docker ps | grep avatar | awk '{print $1}') wget -qO- http://127.0.0.1:3000/health

# 4. Verificar logs de Traefik (no deberían mostrar errores de entrypoints)
docker logs coolify-proxy --tail 50 | grep -i avatar
```

### Paso 5: Probar el Dominio

```bash
# Probar HTTP (debe redirigir a HTTPS)
curl -I http://avatar.edvio.app

# Probar HTTPS (debe responder 200 OK)
curl -I https://avatar.edvio.app

# Probar health check
curl https://avatar.edvio.app/health
```

## 🔍 Verificación de Configuración

### Verificar que Coolify Detectó el Dominio

En los logs de Traefik, deberías ver:
```
✅ Found service avatar
✅ Router avatar configured
```

**NO deberías ver:**
```
❌ EntryPoint doesn't exist
❌ No valid entryPoint
❌ 503 Service Unavailable
```

### Verificar DNS

Asegúrate de que el DNS apunte correctamente:

```bash
# Verificar DNS
nslookup avatar.edvio.app
# O
dig avatar.edvio.app
```

**Debe apuntar a la IP de tu servidor Coolify.**

## ⚠️ Si el Problema Persiste

### Opción A: Verificar Entrypoints de Traefik

Si necesitas usar labels manuales, primero verifica los entrypoints:

```bash
# En el servidor
docker exec coolify-proxy wget -qO- http://localhost:8080/api/entrypoints
```

Luego ajusta las labels en `docker-compose.yml` según los entrypoints encontrados.

### Opción B: Verificar Configuración de Coolify

1. Ve a **Settings** → **Traefik** en Coolify
2. Verifica que:
   - ✅ Let's Encrypt esté habilitado
   - ✅ Email de contacto esté configurado
   - ✅ Cert Resolver sea `letsencrypt`

### Opción C: Reiniciar Traefik

Si nada funciona, reinicia Traefik:

```bash
# En el servidor
docker restart coolify-proxy
```

Espera 30 segundos y vuelve a probar.

## 📋 Checklist Final

Antes de reportar problemas, verifica:

- [ ] Dominio `avatar.edvio.app` agregado en Coolify (sección Domains)
- [ ] Dominio configurado con **HTTPS** (no HTTP)
- [ ] Puerto configurado como **3000**
- [ ] Aplicación redeployada después de agregar el dominio
- [ ] Contenedor está corriendo: `docker ps | grep avatar`
- [ ] Health check responde: `curl http://localhost:3000/health` (desde dentro del contenedor)
- [ ] Logs de Traefik no muestran errores de entrypoints
- [ ] DNS apunta correctamente a tu servidor
- [ ] `https://avatar.edvio.app` carga correctamente

## ✅ Resultado Esperado

Después de seguir estos pasos:

1. ✅ El dominio `avatar.edvio.app` debe estar en Coolify (sección Domains)
2. ✅ Los logs de Traefik no deben mostrar errores de entrypoints
3. ✅ `https://avatar.edvio.app` debe cargar correctamente
4. ✅ El certificado SSL debe estar activo (candado verde 🔒)
5. ✅ `https://avatar.edvio.app/health` debe responder: `{"status":"ok",...}`
6. ✅ `https://avatar.edvio.app/ws-streaming` debe mostrar la aplicación

## 🆘 Si Aún No Funciona

Comparte:

1. **Screenshot de la sección Domains en Coolify** (mostrando cómo está configurado `avatar.edvio.app`)
2. **Logs del contenedor avatar**: `docker logs $(docker ps | grep avatar | awk '{print $1}') --tail 50`
3. **Logs de Traefik**: `docker logs coolify-proxy --tail 100 | grep -i avatar`
4. **Resultado de curl**: `curl -I https://avatar.edvio.app`

Con esta información podremos diagnosticar el problema específico.

