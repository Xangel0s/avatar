#!/bin/bash
# Script para verificar los entrypoints de Traefik en Coolify

echo "🔍 Verificando entrypoints de Traefik en Coolify"
echo "================================================"
echo ""

# Verificar configuración de Traefik
echo "1️⃣ Configuración de Traefik:"
echo "----------------------------"
docker exec coolify-proxy cat /etc/traefik/traefik.yml 2>/dev/null || echo "No se encontró traefik.yml"
echo ""

# Verificar variables de entorno de Traefik
echo "2️⃣ Variables de entorno de Traefik:"
echo "------------------------------------"
docker inspect coolify-proxy | grep -A 50 '"Env"' | grep -i "ENTRYPOINT" || echo "No se encontraron variables de ENTRYPOINT"
echo ""

# Verificar logs de Traefik para ver qué entrypoints están configurados
echo "3️⃣ Entrypoints en logs de Traefik:"
echo "-----------------------------------"
docker logs coolify-proxy 2>&1 | grep -i "entrypoint" | head -20 || echo "No se encontraron referencias a entrypoints en los logs"
echo ""

# Verificar configuración dinámica de Traefik
echo "4️⃣ Configuración dinámica de Traefik:"
echo "-------------------------------------"
docker exec coolify-proxy wget -qO- http://localhost:8080/api/entrypoints 2>/dev/null || echo "No se pudo acceder a la API de Traefik"
echo ""

echo "✅ Verificación completada"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Si no se encuentran entrypoints 'web' y 'websecure', Coolify puede usar nombres diferentes"
echo "2. Alternativamente, remover las labels de Traefik y dejar que Coolify configure el dominio automáticamente"
echo "3. Agregar el dominio 'avatar.edvio.app' en la interfaz de Coolify (sección Domains)"

