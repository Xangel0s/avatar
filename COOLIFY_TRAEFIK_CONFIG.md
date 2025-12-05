# 🔒 Configuración Traefik para Coolify - SSL Automático

## 📋 Configuración Implementada

Se ha creado `docker-compose.yml` con las labels de Traefik necesarias para SSL automático, siguiendo el ejemplo de `minimarket.edvio.app` que funciona correctamente.

## ✅ Características Implementadas

### 1. Labels de Traefik Configuradas

El `docker-compose.yml` incluye todas las labels necesarias:

- ✅ **Habilitación de Traefik**: `traefik.enable=true`
- ✅ **Redirección HTTP → HTTPS**: Automática
- ✅ **SSL con Let's Encrypt**: Configurado automáticamente
- ✅ **Dominio**: `avatar.edvio.app`
- ✅ **Health Check**: Configurado para Traefik

### 2. Redirección HTTP → HTTPS

```yaml
- "traefik.http.routers.avatar-http.rule=Host(`avatar.edvio.app`)"
- "traefik.http.routers.avatar-http.entrypoints=web"
- "traefik.http.routers.avatar-http.middlewares=avatar-https-redirect"
- "traefik.http.middlewares.avatar-https-redirect.redirectscheme.scheme=https"
- "traefik.http.middlewares.avatar-https-redirect.redirectscheme.permanent=true"
```

### 3. Configuración HTTPS

```yaml
- "traefik.http.routers.avatar.rule=Host(`avatar.edvio.app`)"
- "traefik.http.routers.avatar.entrypoints=websecure"
- "traefik.http.routers.avatar.tls=true"
- "traefik.http.routers.avatar.tls.certresolver=letsencrypt"
```

### 4. Puerto del Servicio

```yaml
- "traefik.http.services.avatar.loadbalancer.server.port=3000"
```

## 🚀 Cómo Funciona en Coolify

### Paso 1: Coolify Detecta docker-compose.yml

Coolify detectará automáticamente el archivo `docker-compose.yml` y lo usará para el despliegue.

### Paso 2: Traefik Aplica las Labels

Traefik (que viene preconfigurado en Coolify) leerá las labels del servicio y:
1. Configurará el enrutamiento para `avatar.edvio.app`
2. Solicitará automáticamente un certificado SSL de Let's Encrypt
3. Configurará la redirección HTTP → HTTPS
4. Aplicará el certificado SSL

### Paso 3: Certificado SSL Automático

Let's Encrypt emitirá automáticamente el certificado SSL para `avatar.edvio.app`:
- **Tiempo**: 1-5 minutos después del primer despliegue
- **Renovación**: Automática cada 60 días
- **Método**: HTTP Challenge (para subdominios)

## ⚙️ Configuración en Coolify

### 1. Verificar que Coolify Use docker-compose.yml

1. Ve a tu aplicación en Coolify
2. Verifica que **Build Pack** sea `Docker Compose` o `Dockerfile`
3. Si es `Dockerfile`, cambia a `Docker Compose` para usar las labels de Traefik

### 2. Verificar Let's Encrypt en Coolify

1. Ve a **Settings** → **Traefik**
2. Verifica que:
   - ✅ **Let's Encrypt** esté habilitado
   - ✅ **Email de contacto** esté configurado
   - ✅ **Cert Resolver** sea `letsencrypt`

### 3. Verificar Dominio

1. Ve a tu aplicación → **Domains** o **FQDNs**
2. Verifica que `avatar.edvio.app` esté agregado
3. **IMPORTANTE**: Debe estar marcado como **HTTPS**

### 4. Variables de Entorno

Asegúrate de que estas variables estén configuradas:

```bash
DID_API_KEY=elpapurojoo@gmail.com:zoD9EKRxacSFXOxS2D7JB
OPENROUTER_API_KEY=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
OPENROUTER_APP_URL=https://avatar.edvio.app
ALLOWED_ORIGINS=https://avatar.edvio.app
```

## 🔍 Verificación Post-Deploy

### Test 1: Redirección HTTP → HTTPS

```bash
curl -I http://avatar.edvio.app
```

**Debe responder:**
```
HTTP/1.1 301 Moved Permanently
Location: https://avatar.edvio.app
```

### Test 2: Certificado SSL

```bash
curl -I https://avatar.edvio.app
```

**Debe responder:**
```
HTTP/1.1 200 OK
```

Sin errores de certificado.

### Test 3: Health Check

```bash
curl https://avatar.edvio.app/health
```

**Debe responder:**
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Test 4: Aplicación

1. Abre `https://avatar.edvio.app/ws-streaming` en el navegador
2. Debe mostrar el **candado verde** 🔒
3. No debe mostrar advertencias de seguridad

## 📊 Diferencias con el Ejemplo de Minimarket

| Aspecto | Minimarket | Avatar |
|---------|-----------|--------|
| **Puerto** | 80 (Nginx) | 3000 (Node.js) |
| **Health Check Path** | `/` | `/health` |
| **Dominio** | `minimarket.edvio.app` | `avatar.edvio.app` |
| **Servicios** | 3 (db, api, web) | 1 (avatar) |
| **Labels** | Mismas labels de Traefik | Mismas labels de Traefik |

## ⚠️ Notas Importantes

1. **No usar `ports:` en docker-compose.yml**
   - Coolify/Traefik maneja el enrutamiento externo
   - Usar solo `expose:` para comunicación interna

2. **Labels de Traefik son críticas**
   - Sin las labels, Traefik no sabrá cómo enrutar el tráfico
   - El certificado SSL no se generará automáticamente

3. **Dominio debe estar en Coolify**
   - Aunque las labels especifican el dominio, también debe estar en la sección Domains de Coolify
   - Esto permite que Coolify gestione el DNS y la configuración

4. **Health Check es importante**
   - Traefik usa el health check para saber cuándo el servicio está listo
   - Sin health check, Traefik puede enrutar tráfico antes de que el servicio esté listo

## 🛠️ Solución de Problemas

### Error: "No route found"

**Causa**: Traefik no está leyendo las labels correctamente

**Solución**:
1. Verifica que `docker-compose.yml` esté en la raíz del proyecto
2. Verifica que Coolify esté usando Docker Compose (no solo Dockerfile)
3. Revisa los logs de Traefik en Coolify

### Error: "Certificate not found"

**Causa**: Let's Encrypt no puede emitir el certificado

**Solución**:
1. Verifica que el DNS apunte correctamente a tu servidor
2. Verifica que los puertos 80 y 443 estén abiertos
3. Verifica que Let's Encrypt esté habilitado en Coolify
4. Espera 5 minutos después del primer despliegue

### Error: "Connection refused"

**Causa**: El servicio no está escuchando en el puerto correcto

**Solución**:
1. Verifica que `PORT=3000` esté configurado
2. Verifica que el health check funcione: `curl http://localhost:3000/health`
3. Revisa los logs del contenedor en Coolify

## 📚 Referencias

- [Documentación de Coolify - Docker Compose](https://coolify.io/docs/knowledge-base/docker-compose)
- [Documentación de Traefik - Labels](https://doc.traefik.io/traefik/routing/providers/docker/)
- [Documentación de Traefik - SSL/TLS](https://doc.traefik.io/traefik/https/overview/)
- `docker-compose.yml` - Archivo de configuración
- `SOLUCION_SSL_FINAL.md` - Guía completa de SSL

## ✅ Checklist Final

Antes de desplegar, verifica:

- [ ] `docker-compose.yml` está en la raíz del proyecto
- [ ] Coolify está configurado para usar Docker Compose
- [ ] Let's Encrypt está habilitado en Coolify
- [ ] Dominio `avatar.edvio.app` está agregado en Coolify con HTTPS
- [ ] DNS apunta correctamente a tu servidor
- [ ] Puertos 80 y 443 están abiertos
- [ ] Variables de entorno están configuradas correctamente
- [ ] Health check endpoint `/health` está implementado

¡Listo para desplegar! 🚀

