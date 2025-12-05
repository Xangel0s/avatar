# 🧹 Limpiar Routers Antiguos de Traefik

## ⚠️ Problema

El contenedor NO tiene labels de Traefik (correcto), pero Traefik todavía muestra errores:
```
ERR EntryPoint doesn't exist entryPointName=websecure routerName=avatar@docker
ERR No valid entryPoint for this router routerName=avatar@docker
```

**Causa**: Traefik tiene routers antiguos en memoria que fueron creados antes de remover las labels.

## ✅ Solución: Limpiar Routers Antiguos

### Opción 1: Reiniciar Traefik (MÁS FÁCIL)

```bash
# En el servidor
docker restart coolify-proxy
```

Espera 30 segundos y verifica:

```bash
docker logs coolify-proxy --tail 50 | grep -i "entrypoint"
```

**No deberías ver errores de entrypoints para "avatar".**

### Opción 2: Agregar Dominio en Coolify (RECOMENDADO)

Esto creará los routers correctos y reemplazará los antiguos:

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

**Resultado**: Coolify creará los routers correctos y los errores desaparecerán.

### Opción 3: Limpiar Configuración de Traefik Manualmente

Si las opciones anteriores no funcionan:

```bash
# 1. Reiniciar Traefik
docker restart coolify-proxy

# 2. Esperar 30 segundos
sleep 30

# 3. Verificar que no haya errores
docker logs coolify-proxy --tail 100 | grep -i "entrypoint" | grep -i "avatar"
```

## 🔍 Verificación

Después de limpiar, verifica:

```bash
# Verificar errores de entrypoints
docker logs coolify-proxy --tail 100 | grep -i "entrypoint" | grep -i "avatar"
```

**No deberías ver errores para "avatar".**

## 📋 Checklist

- [ ] Contenedor NO tiene labels de Traefik (✅ ya verificado)
- [ ] Servidor está funcionando (✅ health check OK)
- [ ] Traefik reiniciado o dominio agregado en Coolify
- [ ] Logs de Traefik no muestran errores de entrypoints para "avatar"
- [ ] `https://avatar.edvio.app` carga correctamente

## ✅ Resultado Esperado

Después de limpiar:

1. ✅ Traefik no muestra errores de entrypoints para "avatar"
2. ✅ Si agregaste el dominio en Coolify, `https://avatar.edvio.app` carga correctamente
3. ✅ El certificado SSL está activo (si configuraste HTTPS)

## 🆘 Si Aún No Funciona

Si después de reiniciar Traefik y agregar el dominio en Coolify todavía hay errores:

1. Verifica que el dominio esté correctamente configurado en Coolify
2. Verifica que el DNS apunte correctamente: `nslookup avatar.edvio.app`
3. Verifica los logs completos de Traefik: `docker logs coolify-proxy --tail 200`

