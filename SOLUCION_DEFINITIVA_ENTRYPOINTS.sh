#!/bin/bash
# Solución definitiva para el error de entrypoints

echo "🔧 SOLUCIÓN DEFINITIVA: Error de Entrypoints en Traefik"
echo "========================================================"
echo ""

# 1. Encontrar el contenedor avatar actual
echo "1️⃣ BUSCANDO CONTENEDOR AVATAR ACTUAL:"
echo "-------------------------------------"
AVATAR_CONTAINER=$(docker ps | grep avatar | awk '{print $1}' | head -1)

if [ -z "$AVATAR_CONTAINER" ]; then
    echo "❌ No se encontró contenedor avatar corriendo"
    echo "   Verifica en Coolify que la aplicación esté desplegada"
    exit 1
fi

echo "✅ Contenedor encontrado: $AVATAR_CONTAINER"
echo ""

# 2. Verificar labels de Traefik en el contenedor
echo "2️⃣ LABELS DE TRAEFIK EN EL CONTENEDOR:"
echo "--------------------------------------"
docker inspect $AVATAR_CONTAINER 2>/dev/null | grep -A 50 '"Labels"' | grep "traefik" || echo "✅ No se encontraron labels de Traefik (correcto)"
echo ""

# 3. Verificar entrypoints de Traefik
echo "3️⃣ ENTRYPOINTS DE TRAEFIK:"
echo "-------------------------"
ENTRYPOINTS=$(docker exec coolify-proxy wget -qO- http://localhost:8080/api/entrypoints 2>/dev/null)
if [ ! -z "$ENTRYPOINTS" ]; then
    echo "$ENTRYPOINTS" | python3 -m json.tool 2>/dev/null || echo "$ENTRYPOINTS"
else
    echo "⚠️  No se pudieron obtener los entrypoints"
    echo "   Intentando método alternativo..."
    docker logs coolify-proxy 2>&1 | grep -i "entrypoint" | head -5
fi
echo ""

# 4. Verificar configuración de Traefik
echo "4️⃣ CONFIGURACIÓN DE TRAEFIK:"
echo "----------------------------"
docker exec coolify-proxy cat /etc/traefik/traefik.yml 2>/dev/null | grep -A 10 "entryPoints" || echo "No se encontró traefik.yml o no tiene entryPoints definidos"
echo ""

# 5. Solución recomendada
echo "📋 SOLUCIÓN RECOMENDADA:"
echo "========================"
echo ""
echo "OPCIÓN 1: Dejar que Coolify configure automáticamente (MÁS FÁCIL)"
echo "-------------------------------------------------------------------"
echo "1. Ve a tu aplicación en Coolify"
echo "2. Sección 'Domains' o 'FQDNs'"
echo "3. Agrega 'avatar.edvio.app' con HTTPS"
echo "4. Verifica que el puerto sea 3000"
echo "5. Guarda y haz REDEPLOY"
echo ""
echo "OPCIÓN 2: Remover labels manualmente del contenedor actual"
echo "-----------------------------------------------------------"
echo "Si el contenedor tiene labels de Traefik, necesitas hacer un redeploy"
echo "para que se apliquen los cambios del docker-compose.yml"
echo ""
echo "OPCIÓN 3: Usar entrypoints correctos (si conoces los nombres)"
echo "--------------------------------------------------------------"
if [ ! -z "$ENTRYPOINTS" ]; then
    echo "Entrypoints encontrados arriba. Ajusta las labels en docker-compose.yml"
    echo "según los entrypoints encontrados."
else
    echo "No se pudieron obtener los entrypoints. Usa la OPCIÓN 1."
fi
echo ""

# 6. Verificar si hay labels activas
echo "6️⃣ VERIFICACIÓN FINAL:"
echo "---------------------"
HAS_TRAEFIK_LABELS=$(docker inspect $AVATAR_CONTAINER 2>/dev/null | grep -A 50 '"Labels"' | grep "traefik" | wc -l)
if [ "$HAS_TRAEFIK_LABELS" -gt 0 ]; then
    echo "⚠️  El contenedor TIENE labels de Traefik activas"
    echo "   Necesitas hacer un REDEPLOY en Coolify para aplicar los cambios"
    echo ""
    echo "   Labels encontradas:"
    docker inspect $AVATAR_CONTAINER 2>/dev/null | grep -A 50 '"Labels"' | grep "traefik"
else
    echo "✅ El contenedor NO tiene labels de Traefik (correcto)"
    echo "   Coolify debería configurar el dominio automáticamente"
fi
echo ""

echo "✅ Diagnóstico completado"
echo ""
echo "🎯 ACCIÓN INMEDIATA:"
echo "1. Ve a Coolify → Tu aplicación → Domains"
echo "2. Agrega 'avatar.edvio.app' con HTTPS"
echo "3. Haz REDEPLOY"
echo "4. Espera 30-60 segundos"
echo "5. Prueba: curl -I https://avatar.edvio.app"

