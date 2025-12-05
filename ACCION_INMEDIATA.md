# 🎯 Acción Inmediata: Resolver Error de Entrypoints

## ⚠️ Problema Actual

Los logs de Traefik muestran:
```
ERR EntryPoint doesn't exist entryPointName=websecure
ERR EntryPoint doesn't exist entryPointName=web
```

**Causa**: El contenedor todavía tiene las labels de Traefik activas con entrypoints que no existen.

## ✅ Solución Inmediata (2 Opciones)

### OPCIÓN 1: Configurar Dominio en Coolify (RECOMENDADO - 5 minutos)

**Esta es la forma más fácil y correcta:**

1. **Abre Coolify** en tu navegador
2. Ve a tu aplicación **"avatar"**
3. Busca la sección **"Domains"**, **"FQDNs"** o **"Domain Configuration"**
4. Haz clic en **"Add Domain"** o **"Add FQDN"**
5. Ingresa: `avatar.edvio.app`
6. Selecciona **HTTPS** (no HTTP)
7. Verifica que el puerto sea **3000**
8. Guarda
9. Haz clic en **"Redeploy"** o **"Restart"**
10. Espera 30-60 segundos
11. Prueba: `curl -I https://avatar.edvio.app`

**Resultado**: Coolify configurará Traefik automáticamente con los entrypoints correctos.

### OPCIÓN 2: Verificar Entrypoints y Ajustar Labels (Si la Opción 1 no funciona)

Si necesitas usar labels manuales, primero verifica los entrypoints:

**En el servidor, ejecuta:**
```bash
# Verificar entrypoints de Traefik
docker exec coolify-proxy wget -qO- http://localhost:8080/api/entrypoints
```

**Luego:**
1. Copia los nombres de los entrypoints que encuentres
2. Edita `docker-compose.yml`
3. Descomenta las labels (líneas 51-57)
4. Reemplaza `websecure` y `web` con los nombres reales de los entrypoints
5. Haz commit y push
6. Redeploy en Coolify

## 🔍 Verificación Rápida

**En el servidor, ejecuta:**
```bash
# Ejecutar script de verificación
bash SOLUCION_DEFINITIVA_ENTRYPOINTS.sh
```

O manualmente:
```bash
# 1. Encontrar contenedor actual
docker ps | grep avatar

# 2. Verificar si tiene labels de Traefik
docker inspect $(docker ps | grep avatar | awk '{print $1}') | grep -A 50 '"Labels"' | grep "traefik"

# 3. Verificar entrypoints de Traefik
docker exec coolify-proxy wget -qO- http://localhost:8080/api/entrypoints
```

## 📋 Checklist

- [ ] Dominio `avatar.edvio.app` agregado en Coolify (sección Domains)
- [ ] Dominio configurado con **HTTPS** (no HTTP)
- [ ] Puerto configurado como **3000**
- [ ] Aplicación **REDEPLOYED** después de agregar el dominio
- [ ] Esperado 30-60 segundos después del redeploy
- [ ] Probado: `curl -I https://avatar.edvio.app`

## ✅ Resultado Esperado

Después de seguir la **OPCIÓN 1**:

1. ✅ Los logs de Traefik NO deben mostrar errores de entrypoints
2. ✅ `https://avatar.edvio.app` debe cargar correctamente
3. ✅ El certificado SSL debe estar activo (candado verde 🔒)
4. ✅ `https://avatar.edvio.app/health` debe responder: `{"status":"ok",...}`

## 🆘 Si Aún No Funciona

Comparte:

1. **Screenshot de la sección Domains en Coolify** (mostrando cómo está configurado)
2. **Resultado del script**: `bash SOLUCION_DEFINITIVA_ENTRYPOINTS.sh`
3. **Logs de Traefik**: `docker logs coolify-proxy --tail 50 | grep -i avatar`

Con esta información podremos diagnosticar el problema específico.

