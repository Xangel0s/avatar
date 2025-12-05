# 🔍 Verificación Rápida: "no available server" en Coolify

## ⚠️ Problema Actual

- ✅ Servidor inicia: `Server started on 0.0.0.0:3000`
- ❌ Traefik muestra: "no available server"
- ⚠️ Advertencia: `OPENROUTER_API_KEY no está configurada`

## 🔧 Solución Inmediata

### Paso 1: Verificar Build Pack en Coolify

**CRÍTICO**: Coolify debe estar usando **Docker Compose**, no solo Dockerfile.

1. Ve a tu aplicación en Coolify
2. Busca la sección **Build** o **Deployment**
3. **DEBE** decir **Docker Compose** o mostrar `docker-compose.yml`
4. Si dice solo **Dockerfile**:
   - Ve a **Settings** → **Build Pack**
   - Cambia a **Docker Compose**
   - Guarda y haz **Redeploy**

### Paso 2: Corregir Variable OPENROUTER_API_KEY

El error muestra que `OPENROUTER_API_KEY` no está configurada.

1. Ve a **Environment Variables** en Coolify
2. **Elimina** `PORTOPENROUTER_API_KEY` si existe
3. **Agrega** nueva variable:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: `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`
4. **Guarda** y **reinicia** la aplicación

### Paso 3: Verificar que docker-compose.yml Esté en la Raíz

1. Verifica que `docker-compose.yml` esté en la raíz del proyecto (mismo nivel que `Dockerfile`)
2. Verifica que esté en el repositorio de GitHub
3. Si no está, haz pull del repositorio

### Paso 4: Verificar Dominio en Coolify

1. Ve a tu aplicación → **Domains** o **FQDNs**
2. Verifica que `avatar.edvio.app` esté agregado
3. **DEBE** estar marcado como **HTTPS** (no HTTP)
4. Si no está, agrégalo con HTTPS

### Paso 5: Reiniciar Todo

1. **Redeploy** la aplicación en Coolify
2. Espera 30-60 segundos
3. Verifica los logs:
   - Debe aparecer: `Server started on 0.0.0.0:3000`
   - NO debe aparecer: `ADVERTENCIA: OPENROUTER_API_KEY no está configurada`

## 🧪 Verificación Rápida

### Test 1: Health Check Interno

En los logs del contenedor, busca:
- ✅ `Server started on 0.0.0.0:3000` - Correcto
- ❌ `Server started on localhost:3000` - Incorrecto

### Test 2: Variables de Entorno

En los logs, busca:
- ✅ `Archivos de configuración generados` - Correcto
- ❌ `ADVERTENCIA: OPENROUTER_API_KEY no está configurada` - Corregir variable

### Test 3: Traefik Puede Ver el Servicio

1. Ve a **Settings** → **Traefik** → **Logs**
2. Busca mensajes sobre `avatar` o `avatar.edvio.app`
3. Si hay errores, cópialos para diagnosticar

## ⚡ Solución Rápida (Si Todo Falla)

Si después de verificar todo sigue sin funcionar:

1. **Elimina** la aplicación en Coolify
2. **Crea** una nueva aplicación
3. **Conecta** el mismo repositorio
4. **Configura** como **Docker Compose**
5. **Agrega** todas las variables de entorno correctamente
6. **Agrega** el dominio `avatar.edvio.app` con HTTPS
7. **Deploy**

## 📋 Checklist Rápido

- [ ] Build Pack = **Docker Compose** (no Dockerfile)
- [ ] `docker-compose.yml` está en la raíz del proyecto
- [ ] `OPENROUTER_API_KEY` existe (no `PORTOPENROUTER_API_KEY`)
- [ ] `HOST=0.0.0.0` está configurado
- [ ] Dominio `avatar.edvio.app` está agregado con HTTPS
- [ ] Servidor inicia: `Server started on 0.0.0.0:3000`
- [ ] No hay advertencias sobre variables faltantes

## 🆘 Si Persiste

1. **Copia los logs completos** del contenedor
2. **Copia los logs de Traefik**
3. **Verifica** que Coolify esté usando docker-compose.yml
4. **Revisa** `SOLUCION_TRAEFIK_NO_SERVER.md` para más detalles

