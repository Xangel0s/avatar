# 🔧 Comandos para Ejecutar en el Servidor

## 📋 Verificación del Contenedor Avatar

### 1. Verificar Labels de Traefik en el Contenedor

```bash
# Obtener ID del contenedor
CONTAINER_ID=$(docker ps | grep avatar | awk '{print $1}')

# Verificar labels de Traefik
docker inspect $CONTAINER_ID | grep -A 50 '"Labels"' | grep "traefik"
```

**Si muestra labels de Traefik**, el contenedor todavía las tiene activas y necesitas hacer un redeploy.

**Si NO muestra nada**, el contenedor no tiene labels de Traefik (correcto).

### 2. Verificar Logs del Contenedor

```bash
# Ver logs del contenedor avatar
docker logs $(docker ps | grep avatar | awk '{print $1}') --tail 30
```

### 3. Verificar Health Check

```bash
# Health check interno
docker exec $(docker ps | grep avatar | awk '{print $1}') wget -qO- http://127.0.0.1:3000/health
```

### 4. Verificar Logs de Traefik

```bash
# Logs de Traefik relacionados con avatar
docker logs coolify-proxy --tail 100 | grep -i "avatar" | tail -20
```

### 5. Verificar Errores de Entrypoints

```bash
# Errores de entrypoints en Traefik
docker logs coolify-proxy --tail 200 | grep -i "entrypoint" | tail -10
```

## 🎯 Solución: Configurar Dominio en Coolify

**IMPORTANTE**: El problema es que el contenedor tiene labels de Traefik con entrypoints que no existen. La solución es:

1. **Abre Coolify** en tu navegador (no en el servidor)
2. Ve a tu aplicación **"avatar"**
3. Busca la sección **"Domains"**, **"FQDNs"** o **"Domain Configuration"**
4. Haz clic en **"Add Domain"** o **"Add FQDN"**
5. Ingresa: `avatar.edvio.app`
6. Selecciona **HTTPS** (no HTTP)
7. Verifica que el puerto sea **3000**
8. Guarda
9. Haz clic en **"Redeploy"** o **"Restart"**
10. Espera 30-60 segundos

**Resultado**: Coolify configurará Traefik automáticamente y los errores desaparecerán.

## 📊 Comandos de Verificación Completa

Copia y pega este bloque completo en el servidor:

```bash
echo "=== VERIFICACIÓN COMPLETA ==="
echo ""

# 1. Contenedor avatar
echo "1. CONTENEDOR AVATAR:"
CONTAINER_ID=$(docker ps | grep avatar | awk '{print $1}')
echo "ID: $CONTAINER_ID"
echo "Estado: $(docker ps | grep avatar | awk '{print $7}')"
echo ""

# 2. Labels de Traefik
echo "2. LABELS DE TRAEFIK:"
docker inspect $CONTAINER_ID 2>/dev/null | grep -A 50 '"Labels"' | grep "traefik" || echo "✅ No hay labels de Traefik (correcto)"
echo ""

# 3. Logs del contenedor
echo "3. LOGS DEL CONTENEDOR (últimas 10 líneas):"
docker logs $CONTAINER_ID --tail 10
echo ""

# 4. Health check
echo "4. HEALTH CHECK:"
docker exec $CONTAINER_ID wget -qO- http://127.0.0.1:3000/health 2>&1
echo ""

# 5. Logs de Traefik
echo "5. LOGS DE TRAEFIK (avatar):"
docker logs coolify-proxy --tail 100 2>&1 | grep -i "avatar" | tail -5 || echo "No se encontraron logs relacionados"
echo ""

# 6. Errores de entrypoints
echo "6. ERRORES DE ENTRYPOINTS:"
docker logs coolify-proxy --tail 200 2>&1 | grep -i "entrypoint" | tail -5 || echo "✅ No hay errores de entrypoints"
echo ""

echo "=== FIN DE VERIFICACIÓN ==="
```

## ✅ Resultado Esperado

Después de agregar el dominio en Coolify y hacer redeploy:

1. ✅ El contenedor NO debe tener labels de Traefik (o Coolify las habrá configurado correctamente)
2. ✅ Los logs de Traefik NO deben mostrar errores de entrypoints
3. ✅ `https://avatar.edvio.app` debe cargar correctamente

