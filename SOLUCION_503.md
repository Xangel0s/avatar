# 🔧 Solución: Error 503 (Service Unavailable) en Traefik

## ⚠️ Problema

Error: **503 Service Unavailable** en `https://avatar.edvio.app`

**Síntomas**:
- ✅ Servidor inicia: `Server started on 0.0.0.0:3000`
- ❌ Traefik responde: `503 Service Unavailable`
- ❌ La página no carga

## 🔍 Causas Posibles

### 1. Health Check Falla

**Problema**: Traefik espera a que el health check pase antes de enrutar tráfico.

**Solución**: 
- Verificar que `/health` responda correctamente
- Aumentar `start_period` si el servidor tarda en iniciar
- Remover health check de labels de Traefik si causa problemas

### 2. Servicio No Está Listo

**Problema**: Traefik intenta conectarse antes de que el servidor esté completamente listo.

**Solución**:
- Aumentar el tiempo de espera inicial
- Verificar que el servidor esté realmente escuchando

### 3. Puerto No Coincide

**Problema**: El puerto en las labels de Traefik no coincide con el puerto del servicio.

**Solución**:
- Verificar que `traefik.http.services.avatar.loadbalancer.server.port=3000`
- Verificar que `PORT=3000` esté configurado
- Verificar que el servidor escuche en el puerto 3000

## ✅ Soluciones Implementadas

### 1. Health Check Mejorado

- Cambiado a `127.0.0.1` (más confiable que `0.0.0.0` para health check interno)
- `start_period` ajustado a 20s
- Intervalo reducido a 10s para detección más rápida

### 2. Health Check Removido de Labels de Traefik

- Comentado el health check en las labels de Traefik
- Esto permite que Traefik enrute tráfico inmediatamente sin esperar el health check
- El health check del contenedor sigue funcionando para Docker

### 3. Logs Mejorados

- Agregados logs más detallados al iniciar el servidor
- Manejo de errores del servidor

## 🛠️ Pasos para Resolver

### Paso 1: Verificar Health Check

1. Espera 20-30 segundos después de que el servidor inicie
2. Verifica en los logs que no haya errores
3. El health check debe pasar después de `start_period` (20s)

### Paso 2: Verificar que el Servidor Esté Escuchando

En los logs debe aparecer:
```
✅ Server started on 0.0.0.0:3000
✅ Health check available at http://0.0.0.0:3000/health
```

### Paso 3: Verificar Traefik

1. Ve a **Settings** → **Traefik** → **Logs**
2. Busca errores relacionados con:
   - `503`
   - `connection refused`
   - `health check failed`
   - `service not ready`

### Paso 4: Reiniciar la Aplicación

1. **Redeploy** en Coolify
2. Espera 30-60 segundos
3. Verifica que el servidor esté completamente iniciado
4. Prueba `https://avatar.edvio.app/health`

## 🧪 Tests de Verificación

### Test 1: Health Check Directo

```bash
# Desde dentro del contenedor
curl http://127.0.0.1:3000/health
```

**Debe responder:**
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Test 2: Servidor Escuchando

```bash
# Verificar que el puerto esté escuchando
netstat -tuln | grep 3000
```

**Debe mostrar:**
```
0.0.0.0:3000
```

### Test 3: Traefik Puede Conectarse

En los logs de Traefik, busca:
- ✅ `Found service avatar` - Correcto
- ❌ `503 Service Unavailable` - Problema
- ❌ `connection refused` - El servidor no está escuchando

## ⚠️ Solución Temporal

Si el problema persiste, puedes:

1. **Remover completamente el health check de Traefik**:
   - Las labels de health check ya están comentadas
   - Esto permite que Traefik enrute tráfico inmediatamente

2. **Aumentar start_period**:
   - Si el servidor tarda más en iniciar, aumenta `start_period` a 40s o 60s

3. **Verificar que no haya otros servicios usando el puerto 3000**

## 📋 Checklist de Verificación

- [ ] Servidor inicia: `Server started on 0.0.0.0:3000`
- [ ] Health check responde: `curl http://127.0.0.1:3000/health`
- [ ] Puerto 3000 está escuchando en `0.0.0.0`
- [ ] No hay errores en los logs del contenedor
- [ ] Traefik puede ver el servicio (verificar logs de Traefik)
- [ ] Health check del contenedor pasa después de 20s
- [ ] Variables de entorno están correctas

## ✅ Después de Corregir

Una vez corregido:

1. ✅ El servidor debe estar escuchando en `0.0.0.0:3000`
2. ✅ El health check debe responder correctamente
3. ✅ Traefik debe poder enrutar el tráfico
4. ✅ `https://avatar.edvio.app` debe cargar sin errores 503
5. ✅ `https://avatar.edvio.app/health` debe responder

## 📚 Referencias

- `docker-compose.yml` - Configuración con health check mejorado
- `app.js` - Servidor con logs mejorados y manejo de errores
- `VERIFICACION_COOLIFY.md` - Guía de verificación rápida
- `SOLUCION_TRAEFIK_NO_SERVER.md` - Guía completa de solución

