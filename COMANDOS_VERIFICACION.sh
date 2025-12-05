#!/bin/bash
# Script de verificación rápida para el servidor

echo "🔍 VERIFICACIÓN RÁPIDA: Estado de Avatar en Coolify"
echo "====================================================="
echo ""

# 1. Verificar contenedores corriendo
echo "1️⃣ CONTENEDORES CORRIENDO:"
echo "---------------------------"
docker ps | grep avatar || echo "❌ No se encontró contenedor avatar"
echo ""

# 2. Obtener ID del contenedor avatar
AVATAR_CONTAINER=$(docker ps | grep avatar | awk '{print $1}' | head -1)

if [ -z "$AVATAR_CONTAINER" ]; then
    echo "❌ No se encontró contenedor avatar corriendo"
    echo "   Verifica en Coolify que la aplicación esté desplegada"
    exit 1
fi

echo "✅ Contenedor encontrado: $AVATAR_CONTAINER"
echo ""

# 3. Verificar logs del contenedor
echo "2️⃣ LOGS DEL CONTENEDOR (últimas 20 líneas):"
echo "-------------------------------------------"
docker logs $AVATAR_CONTAINER --tail 20
echo ""

# 4. Verificar health check interno
echo "3️⃣ HEALTH CHECK INTERNO:"
echo "-----------------------"
docker exec $AVATAR_CONTAINER wget -qO- http://127.0.0.1:3000/health 2>&1
echo ""

# 5. Verificar que el puerto esté escuchando
echo "4️⃣ PUERTO ESCUCHANDO:"
echo "--------------------"
docker exec $AVATAR_CONTAINER netstat -tuln 2>/dev/null | grep 3000 || \
docker exec $AVATAR_CONTAINER ss -tuln 2>/dev/null | grep 3000 || \
echo "⚠️  No se pudo verificar (netstat/ss no disponibles)"
echo ""

# 6. Verificar logs de Traefik relacionados con avatar
echo "5️⃣ LOGS DE TRAEFIK (avatar):"
echo "---------------------------"
docker logs coolify-proxy --tail 100 2>&1 | grep -i "avatar" | tail -10 || echo "No se encontraron logs relacionados con 'avatar'"
echo ""

# 7. Verificar errores de entrypoints en Traefik
echo "6️⃣ ERRORES DE ENTRYPOINTS EN TRAEFIK:"
echo "------------------------------------"
docker logs coolify-proxy --tail 200 2>&1 | grep -i "entrypoint" | tail -10 || echo "✅ No se encontraron errores de entrypoints"
echo ""

# 8. Verificar labels de Traefik en el contenedor
echo "7️⃣ LABELS DE TRAEFIK EN EL CONTENEDOR:"
echo "--------------------------------------"
docker inspect $AVATAR_CONTAINER 2>/dev/null | grep -A 30 '"Labels"' | grep "traefik" | head -10 || echo "No se encontraron labels de Traefik"
echo ""

# 9. Verificar IP del contenedor
echo "8️⃣ IP DEL CONTENEDOR:"
echo "---------------------"
CONTAINER_IP=$(docker inspect $AVATAR_CONTAINER 2>/dev/null | grep -o '"IPAddress":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$CONTAINER_IP" ]; then
    echo "IP: $CONTAINER_IP"
    echo "Probando conexión desde Traefik..."
    docker exec coolify-proxy wget -qO- --timeout=5 http://$CONTAINER_IP:3000/health 2>&1 || echo "⚠️  No se pudo conectar desde Traefik"
else
    echo "⚠️  No se pudo obtener la IP del contenedor"
fi
echo ""

# 10. Resumen
echo "📋 RESUMEN:"
echo "----------"
echo "Contenedor: $AVATAR_CONTAINER"
echo "Estado: $(docker ps | grep $AVATAR_CONTAINER | awk '{print $7}')"
echo ""

echo "✅ Verificación completada"
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo "1. Si hay errores de entrypoints, agrega el dominio en Coolify (sección Domains)"
echo "2. Si el health check falla, verifica los logs del contenedor"
echo "3. Si Traefik no puede conectarse, verifica la red y el puerto"
echo "4. Si todo está bien pero no funciona, verifica el DNS y el dominio en Coolify"

