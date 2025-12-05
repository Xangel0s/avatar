# 🔧 Solución: "no available server" en Traefik

## ⚠️ Problema

Error: **"no available server"** en la página `avatar.edvio.app`

**Causa**: Traefik no puede encontrar un servidor disponible para enrutar el tráfico.

## ✅ Solución Implementada

### 1. Servidor Escuchando en 0.0.0.0

**Problema**: El servidor Node.js estaba escuchando solo en `localhost`, lo que impide que Traefik se conecte desde fuera del contenedor.

**Solución**: Modificado `app.js` para escuchar en `0.0.0.0`:

```javascript
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  console.log(`Server started on ${host}:${port}`);
});
```

### 2. Variable de Entorno HOST

Agregada variable `HOST=0.0.0.0` en `docker-compose.yml` para asegurar que el servidor escuche en todas las interfaces de red.

## 🔍 Verificaciones Adicionales

### 1. Verificar que el Contenedor Esté Corriendo

En Coolify:
1. Ve a tu aplicación
2. Verifica que el estado sea **Running** (verde)
3. Si está en **Stopped** o **Error**, revisa los logs

### 2. Verificar Health Check

El health check debe responder correctamente:

```bash
# Desde dentro del contenedor o desde el servidor
curl http://localhost:3000/health
```

**Debe responder:**
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### 3. Verificar Logs del Contenedor

En Coolify:
1. Ve a tu aplicación → **Logs**
2. Busca mensajes como:
   - ✅ `Server started on 0.0.0.0:3000` - Correcto
   - ❌ `Server started on localhost:3000` - Incorrecto
   - ❌ Errores de conexión o puerto

### 4. Verificar Labels de Traefik

En Coolify:
1. Ve a **Settings** → **Traefik** → **Logs**
2. Busca errores relacionados con:
   - `no available server`
   - `connection refused`
   - `service not found`

### 5. Verificar Puerto en docker-compose.yml

Asegúrate de que:
- `expose: - "3000"` esté configurado
- `traefik.http.services.avatar.loadbalancer.server.port=3000` esté en las labels
- El puerto coincida con `PORT=3000` en las variables de entorno

## 🛠️ Pasos para Resolver

### Paso 1: Verificar Configuración

1. Verifica que `docker-compose.yml` esté en la raíz del proyecto
2. Verifica que Coolify esté usando **Docker Compose** (no solo Dockerfile)
3. Verifica que el contenedor esté corriendo

### Paso 2: Reiniciar la Aplicación

1. En Coolify, ve a tu aplicación
2. Haz clic en **Restart** o **Redeploy**
3. Espera a que el contenedor se inicie completamente

### Paso 3: Verificar Logs

1. Ve a **Logs** en Coolify
2. Busca el mensaje: `Server started on 0.0.0.0:3000`
3. Si no aparece, el servidor no está escuchando correctamente

### Paso 4: Verificar Health Check

1. Espera 15-30 segundos después del reinicio
2. Verifica que el health check responda:
   ```bash
   curl http://localhost:3000/health
   ```
3. Si no responde, hay un problema con el servidor

### Paso 5: Verificar Traefik

1. Ve a **Settings** → **Traefik** → **Logs**
2. Busca mensajes sobre el servicio `avatar`
3. Si hay errores, cópialos para diagnosticar

## ⚠️ Problemas Comunes

### Error: "Connection refused"

**Causa**: El servidor no está escuchando en `0.0.0.0`

**Solución**: 
- Verifica que `HOST=0.0.0.0` esté en las variables de entorno
- Verifica que el código use `server.listen(port, host, ...)`

### Error: "Service not found"

**Causa**: Traefik no puede encontrar el servicio

**Solución**:
- Verifica que `traefik.enable=true` esté en las labels
- Verifica que el contenedor esté en la misma red que Traefik
- Reinicia Traefik si es necesario

### Error: "Health check failed"

**Causa**: El health check no responde correctamente

**Solución**:
- Verifica que el endpoint `/health` esté implementado
- Verifica que el servidor esté corriendo
- Aumenta el `start_period` en el health check si el servidor tarda en iniciar

## 📋 Checklist de Verificación

Antes de reportar problemas, verifica:

- [ ] El servidor está escuchando en `0.0.0.0:3000` (no `localhost:3000`)
- [ ] Variable `HOST=0.0.0.0` está configurada en docker-compose.yml
- [ ] El contenedor está en estado **Running**
- [ ] El health check `/health` responde correctamente
- [ ] Las labels de Traefik están correctas en docker-compose.yml
- [ ] El puerto 3000 está expuesto en docker-compose.yml
- [ ] Los logs no muestran errores críticos
- [ ] Traefik puede ver el servicio (verificar logs de Traefik)

## ✅ Después de Corregir

Una vez corregido:

1. ✅ El servidor debe estar escuchando en `0.0.0.0:3000`
2. ✅ El health check debe responder correctamente
3. ✅ Traefik debe poder enrutar el tráfico
4. ✅ `https://avatar.edvio.app` debe cargar sin errores
5. ✅ `https://avatar.edvio.app/health` debe responder

## 📚 Referencias

- `docker-compose.yml` - Configuración con labels de Traefik
- `app.js` - Servidor Node.js configurado para escuchar en 0.0.0.0
- `COOLIFY_TRAEFIK_CONFIG.md` - Guía completa de configuración Traefik

