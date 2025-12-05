#!/bin/bash
# Comandos de diagnóstico para ejecutar en el servidor

echo "🔍 DIAGNÓSTICO: Error 503 con Contenedor Healthy"
echo "================================================"
echo ""

# 1. Verificar logs del contenedor avatar
echo "1️⃣ LOGS DEL CONTENEDOR AVATAR:"
echo "--------------------------------"
docker logs avatar-qokw4w04wkc08owss8088o0g-110558639840 --tail 30
echo ""

# 2. Verificar health check interno
echo "2️⃣ HEALTH CHECK INTERNO:"
echo "------------------------"
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 wget -qO- http://127.0.0.1:3000/health 2>&1
echo ""

# 3. Verificar que el puerto esté escuchando
echo "3️⃣ PUERTO ESCUCHANDO:"
echo "---------------------"
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 netstat -tuln 2>/dev/null | grep 3000 || echo "netstat no disponible, intentando con ss..."
docker exec avatar-qokw4w04wkc08owss8088o0g-110558639840 ss -tuln 2>/dev/null | grep 3000 || echo "ss no disponible"
echo ""

# 4. Verificar logs de Traefik relacionados con avatar
echo "4️⃣ LOGS DE TRAEFIK (avatar):"
echo "----------------------------"
docker logs coolify-proxy --tail 100 2>&1 | grep -i "avatar" | tail -20 || echo "No se encontraron logs relacionados con 'avatar'"
echo ""

# 5. Verificar labels de Traefik
echo "5️⃣ LABELS DE TRAEFIK:"
echo "---------------------"
docker inspect avatar-qokw4w04wkc08owss8088o0g-110558639840 2>/dev/null | grep -A 30 '"Labels"' | grep "traefik" | head -20
echo ""

# 6. Verificar red del contenedor
echo "6️⃣ RED DEL CONTENEDOR:"
echo "---------------------"
docker inspect avatar-qokw4w04wkc08owss8088o0g-110558639840 2>/dev/null | grep -A 5 '"Networks"'
echo ""

# 7. Intentar conexión desde Traefik al contenedor
echo "7️⃣ CONEXIÓN DESDE TRAEFIK:"
echo "--------------------------"
CONTAINER_IP=$(docker inspect avatar-qokw4w04wkc08owss8088o0g-110558639840 2>/dev/null | grep -o '"IPAddress":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ ! -z "$CONTAINER_IP" ]; then
    echo "IP del contenedor: $CONTAINER_IP"
    docker exec coolify-proxy wget -qO- --timeout=5 http://$CONTAINER_IP:3000/health 2>&1 || echo "No se pudo conectar desde Traefik"
else
    echo "No se pudo obtener la IP del contenedor"
fi
echo ""

echo "✅ Diagnóstico completado"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Si el health check falla, verifica los logs del contenedor"
echo "2. Si Traefik no puede conectarse, verifica la red y las labels"
echo "3. Si todo está bien, haz un REDEPLOY en Coolify para aplicar los cambios"

