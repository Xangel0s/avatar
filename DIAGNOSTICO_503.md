# 🔍 Diagnóstico: Error 503 con Contenedor Healthy

## ✅ Estado Actual

Según los logs del servidor:
- ✅ Contenedor `avatar` está corriendo: `Up 2 minutes (healthy)`
- ✅ Puerto expuesto: `3000/tcp`
- ✅ Traefik está corriendo: `Up 10 hours (healthy)`
- ❌ Pero Traefik responde: `503 Service Unavailable`

## 🔍 Diagnóstico Paso a Paso

### Paso 1: Verificar Logs del Contenedor Avatar

```bash
docker logs avatar-qokw4w04wkc08owss8088o0g-110558639840
```

**Busca:**
- ✅ `Server started on 0.0.0.0:3000` - Correcto
- ✅ `Health check available at http://0.0.0.0:3000/health` - Correcto
- ❌ Errores de conexión o puerto - Problema

### Paso 2: Verificar Health Check Interno

```bash
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 wget -qO- http://127.0.0.1:3000/health
```

**Debe responder:**
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Paso 3: Verificar que el Servidor Esté Escuchando

```bash
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 netstat -tuln | grep 3000
```

**Debe mostrar:**
```
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN
```

### Paso 4: Verificar Logs de Traefik

```bash
docker logs coolify-proxy --tail 100
```

**Busca:**
- ✅ `Found service avatar` - Correcto
- ❌ `503 Service Unavailable` - Problema
- ❌ `connection refused` - El servidor no está escuchando
- ❌ `health check failed` - El health check está fallando
- ❌ `no available server` - Traefik no puede encontrar el servicio

### Paso 5: Verificar Labels de Traefik

```bash
docker inspect avatar-qokw4w04wkc08owss8088o0g-110558639840 | grep -A 50 "Labels"
```

**Busca:**
- ✅ `traefik.enable=true`
- ✅ `traefik.http.services.avatar.loadbalancer.server.port=3000`
- ⚠️ Si hay `traefik.http.services.avatar.loadbalancer.healthcheck.path=/health`, esto puede estar causando el problema

### Paso 6: Verificar Red de Docker

```bash
docker network inspect $(docker inspect avatar-qokw4w04wkc08owss8088o0g-110558639840 | grep -o '"NetworkMode":"[^"]*"' | cut -d'"' -f4)
```

**Verifica que:**
- El contenedor `avatar` esté en la misma red que `coolify-proxy`
- La red permita comunicación entre contenedores

## 🛠️ Soluciones Según el Diagnóstico

### Si el Health Check Interno Falla

**Problema**: El servidor no está respondiendo en `/health`

**Solución**:
1. Verifica que el servidor esté completamente iniciado
2. Espera 30-60 segundos después del inicio
3. Verifica que no haya errores en los logs

### Si Traefik No Puede Conectarse

**Problema**: Traefik no puede alcanzar el puerto 3000

**Solución**:
1. Verifica que el servidor esté escuchando en `0.0.0.0:3000` (no `127.0.0.1:3000`)
2. Verifica que el puerto en las labels coincida: `traefik.http.services.avatar.loadbalancer.server.port=3000`
3. Reinicia el contenedor avatar

### Si el Health Check de Traefik Está Causando el Problema

**Problema**: Traefik espera a que el health check pase antes de enrutar tráfico

**Solución**:
1. Remueve el health check de las labels de Traefik (ya está comentado en el código)
2. Redeploy la aplicación
3. Verifica que Traefik pueda enrutar inmediatamente

### Si Hay Problemas de Red

**Problema**: El contenedor no está en la red correcta

**Solución**:
1. Verifica que Coolify esté usando `docker-compose.yml`
2. Verifica que el contenedor esté en la red de Coolify
3. Reinicia Traefik si es necesario

## 📋 Comandos de Verificación Rápida

```bash
# 1. Verificar logs del contenedor
docker logs avatar-qokw4w04wkc08owss8088o0g-110558639840 --tail 50

# 2. Verificar health check
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 wget -qO- http://127.0.0.1:3000/health

# 3. Verificar que el puerto esté escuchando
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 netstat -tuln | grep 3000

# 4. Verificar logs de Traefik
docker logs coolify-proxy --tail 100 | grep -i avatar

# 5. Verificar labels de Traefik
docker inspect avatar-qokw4w04wkc08owss8088o0g-110558639840 | grep -A 30 "traefik"

# 6. Probar conexión desde Traefik al contenedor
docker exec coolify-proxy wget -qO- http://avatar-qokw4w04wkc08owss8088o0g-110558639840:3000/health
```

## ⚠️ Solución Temporal

Si el problema persiste después de verificar todo:

1. **Remover completamente el health check de Traefik**:
   - Ya está comentado en `docker-compose.yml`
   - Redeploy la aplicación

2. **Aumentar el tiempo de espera inicial**:
   - Aumenta `start_period` a 60s en `docker-compose.yml`
   - Redeploy

3. **Verificar que el servidor esté completamente iniciado**:
   - Espera 60 segundos después del inicio
   - Verifica los logs para confirmar que el servidor está listo

## ✅ Después de Corregir

Una vez corregido:

1. ✅ El contenedor debe estar `(healthy)`
2. ✅ El health check debe responder: `{"status":"ok",...}`
3. ✅ El puerto 3000 debe estar escuchando en `0.0.0.0:3000`
4. ✅ Traefik debe poder enrutar el tráfico
5. ✅ `https://avatar.edvio.app` debe cargar sin errores 503
6. ✅ `https://avatar.edvio.app/health` debe responder

