# 🔧 Solución: "no available server" en Traefik - Guía Completa

## ⚠️ Problema

Error: **"no available server"** en Traefik después de que el servidor inicia correctamente.

**Síntomas**:
- ✅ Servidor inicia: `Server started on 0.0.0.0:3000`
- ❌ Traefik muestra: "no available server"
- ❌ La página no carga

## 🔍 Causas Posibles

### 1. Coolify No Está Usando docker-compose.yml

**Problema**: Coolify puede estar usando solo el Dockerfile en lugar de docker-compose.yml.

**Solución**:
1. Ve a tu aplicación en Coolify
2. Verifica la sección **Build Pack** o **Deployment**
3. **DEBE** estar configurado como **Docker Compose** (no solo Dockerfile)
4. Si está como Dockerfile, cámbialo a Docker Compose

### 2. Variables de Entorno No Configuradas

**Problema**: Las variables no están disponibles en el contenedor.

**Solución**:
1. Ve a **Environment Variables** en Coolify
2. Verifica que estas variables existan:
   ```
   OPENROUTER_API_KEY=sk-or-v1-... (NO PORTOPENROUTER_API_KEY)
   DID_API_KEY=elpapurojoo@gmail.com:zoD9EKRxacSFXOxS2D7JB
   HOST=0.0.0.0
   PORT=3000
   ```

### 3. Traefik No Puede Ver el Contenedor

**Problema**: El contenedor no está en la red correcta para Traefik.

**Solución**: 
- Verifica que Coolify esté usando docker-compose.yml
- Las labels de Traefik deben estar correctas
- El contenedor debe estar en la red de Coolify

### 4. Health Check Falla

**Problema**: El health check no responde, Traefik marca el servicio como no disponible.

**Solución**:
1. Verifica que `/health` responda:
   ```bash
   curl http://localhost:3000/health
   ```
2. Si no responde, hay un problema con el servidor
3. Aumenta el `start_period` en el health check si el servidor tarda en iniciar

## ✅ Soluciones Implementadas

### 1. docker-compose.yml Mejorado

- ✅ Removido `container_name` (Coolify lo maneja automáticamente)
- ✅ Agregada label de red: `traefik.docker.network=coolify`
- ✅ Health check configurado correctamente

### 2. Verificación de Variables

El script `generate-config.sh` ahora verifica y advierte sobre variables faltantes.

## 🛠️ Pasos para Resolver

### Paso 1: Verificar Build Pack en Coolify

1. Ve a tu aplicación en Coolify
2. Sección **Build** o **Deployment**
3. **DEBE** decir **Docker Compose** o **docker-compose.yml**
4. Si dice solo **Dockerfile**, cámbialo:
   - Ve a **Settings** o **Configuration**
   - Cambia **Build Pack** a **Docker Compose**
   - Guarda y redeploy

### Paso 2: Verificar Variables de Entorno

1. Ve a **Environment Variables**
2. **Elimina** `PORTOPENROUTER_API_KEY` si existe
3. **Agrega** `OPENROUTER_API_KEY` con el valor correcto
4. **Agrega** `HOST=0.0.0.0` si no existe
5. **Verifica** que `PORT=3000` esté configurado

### Paso 3: Verificar Logs del Contenedor

1. Ve a **Logs** en Coolify
2. Busca:
   - ✅ `Server started on 0.0.0.0:3000` - Correcto
   - ✅ `Archivos de configuración generados` - Correcto
   - ❌ `ADVERTENCIA: OPENROUTER_API_KEY no está configurada` - Corregir variable

### Paso 4: Verificar Logs de Traefik

1. Ve a **Settings** → **Traefik** → **Logs**
2. Busca errores relacionados con:
   - `avatar` (nombre del servicio)
   - `no available server`
   - `connection refused`
   - `service not found`

### Paso 5: Reiniciar Todo

1. **Reinicia la aplicación** en Coolify
2. **Espera 30-60 segundos** para que todo se inicie
3. **Verifica** que el contenedor esté en estado **Running**
4. **Prueba** `https://avatar.edvio.app/health`

## 🔧 Configuración Manual en Coolify (Si docker-compose.yml No Funciona)

Si Coolify no detecta docker-compose.yml automáticamente:

### Opción A: Forzar Docker Compose

1. Ve a tu aplicación → **Settings**
2. Busca **Build Pack** o **Deployment Method**
3. Selecciona **Docker Compose**
4. Especifica el archivo: `docker-compose.yml`
5. Guarda y redeploy

### Opción B: Usar Solo Dockerfile con Labels en Coolify

Si no puedes usar docker-compose.yml:

1. Ve a tu aplicación → **Domains**
2. Agrega `avatar.edvio.app` con HTTPS
3. Coolify configurará Traefik automáticamente
4. Asegúrate de que el puerto sea `3000`

## 📋 Checklist de Verificación

Antes de reportar problemas, verifica:

- [ ] Build Pack está configurado como **Docker Compose**
- [ ] `docker-compose.yml` está en la raíz del proyecto
- [ ] Variables de entorno están correctas:
  - [ ] `OPENROUTER_API_KEY` (no `PORTOPENROUTER_API_KEY`)
  - [ ] `HOST=0.0.0.0`
  - [ ] `PORT=3000`
- [ ] El contenedor está en estado **Running**
- [ ] Los logs muestran: `Server started on 0.0.0.0:3000`
- [ ] El health check responde: `curl http://localhost:3000/health`
- [ ] Traefik puede ver el servicio (verificar logs de Traefik)
- [ ] El dominio `avatar.edvio.app` está agregado en Coolify con HTTPS

## 🧪 Tests de Verificación

### Test 1: Health Check Interno

```bash
# Desde dentro del contenedor o desde el servidor
curl http://localhost:3000/health
```

**Debe responder:**
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Test 2: Servidor Escuchando

```bash
# Verificar que el puerto 3000 esté escuchando
netstat -tuln | grep 3000
# O
ss -tuln | grep 3000
```

**Debe mostrar:**
```
0.0.0.0:3000
```

### Test 3: Traefik Puede Conectarse

En los logs de Traefik, busca:
- ✅ `Found service avatar` - Correcto
- ❌ `no available server` - Problema

## ⚠️ Problemas Específicos

### Error: "OPENROUTER_API_KEY no está configurada"

**Causa**: La variable está mal nombrada o no existe.

**Solución**:
1. Ve a **Environment Variables** en Coolify
2. **Elimina** `PORTOPENROUTER_API_KEY` si existe
3. **Agrega** `OPENROUTER_API_KEY` con el valor correcto
4. Reinicia la aplicación

### Error: "Container not found"

**Causa**: El contenedor no se está creando correctamente.

**Solución**:
1. Verifica los logs de build en Coolify
2. Verifica que el Dockerfile sea válido
3. Verifica que todas las dependencias estén instaladas

### Error: "Network not found"

**Causa**: El contenedor no está en la red de Coolify.

**Solución**:
- Coolify maneja las redes automáticamente
- No especifiques `networks:` en docker-compose.yml
- Deja que Coolify lo maneje

## 📚 Referencias

- `docker-compose.yml` - Configuración con labels de Traefik
- `COOLIFY_TRAEFIK_CONFIG.md` - Guía completa de configuración
- `SOLUCION_NO_AVAILABLE_SERVER.md` - Solución para servidor no disponible

## ✅ Después de Corregir

Una vez corregido:

1. ✅ El servidor debe estar escuchando en `0.0.0.0:3000`
2. ✅ Traefik debe poder ver el servicio
3. ✅ `https://avatar.edvio.app` debe cargar correctamente
4. ✅ `https://avatar.edvio.app/health` debe responder
5. ✅ No debe aparecer "no available server"

