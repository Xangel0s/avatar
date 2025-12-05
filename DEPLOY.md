# 🚀 Guía de Despliegue en Producción

## Despliegue con Coolify

### 1. Preparación del Repositorio
- ✅ Todos los archivos están en GitHub: `https://github.com/Xangel0s/avatar`
- ✅ Dockerfile configurado para producción
- ✅ Variables de entorno configuradas

### 2. Configuración en Coolify

#### Paso 1: Crear Nueva Aplicación
1. Ve a **Projects** → **Create a new Application**
2. Selecciona tu repositorio: `https://github.com/Xangel0s/avatar`
3. Branch: `main`

#### Paso 2: Configuración de Build
- **Build Pack**: `Dockerfile` (Coolify detectará automáticamente el Dockerfile)
- **Base Directory**: `/` (raíz)
- **Build Command**: (dejar vacío, Dockerfile maneja todo)
- **Dockerfile Path**: `Dockerfile` (o dejar vacío para auto-detección)

#### Paso 3: Variables de Entorno
Agregar las siguientes variables de entorno en Coolify:

**Requeridas:**
- `OPENROUTER_API_KEY`: Tu API key de OpenRouter
- `PORT`: `3000` (o el puerto que prefieras)

**Opcionales:**
- `ALLOWED_ORIGINS`: Orígenes permitidos para CORS (separados por comas, o `*` para todos)
- `NODE_ENV`: `production`

#### Paso 4: Configuración de Puerto
- **Port**: `3000` (o el puerto que configuraste en variables de entorno)
- **Is it a static site?**: ❌ **NO** (marcar como NO, es una aplicación Node.js)

#### Paso 5: Deploy
1. Haz clic en **Deploy**
2. Coolify construirá la imagen Docker
3. Desplegará la aplicación
4. Obtendrás una URL pública

### 3. Configuración de Archivos Sensibles

**IMPORTANTE**: Los siguientes archivos NO deben estar en el repositorio (ya están en .gitignore):
- `api.json` - Contiene la API key de D-ID
- `openrouter.json` - Contiene la API key de OpenRouter
- `config.env` - Variables de entorno locales

**Para producción en Coolify:**
- Usa las **Variables de Entorno** de Coolify para las API keys
- El código cargará las variables de entorno automáticamente

### 4. Verificación Post-Deploy

Después del despliegue, verifica:
1. ✅ La aplicación carga en la URL proporcionada
2. ✅ El avatar se conecta correctamente
3. ✅ La cámara y micrófono funcionan
4. ✅ El reconocimiento de voz funciona
5. ✅ El análisis visual funciona

### 5. URLs de la Aplicación

- **Principal**: `https://tu-dominio.com/`
- **WebSocket Streaming**: `https://tu-dominio.com/ws-streaming` (recomendado)

## Alternativa: Despliegue con Docker Directo

Si prefieres usar Docker directamente:

```bash
# Construir imagen
docker build -t avatar-ia .

# Ejecutar contenedor
docker run -d \
  -p 3000:3000 \
  -e OPENROUTER_API_KEY=tu_api_key \
  -e PORT=3000 \
  --name avatar-ia \
  avatar-ia
```

## Notas Importantes

- La aplicación funciona completamente en el cliente (navegador)
- No requiere base de datos
- Las API keys se configuran mediante variables de entorno
- El servidor Node.js solo sirve archivos estáticos y maneja CORS
- Todos los procesamientos (IA, visión, voz) ocurren en el navegador

## Solución de Problemas

### Error: "Cannot find module"
- Verifica que `package.json` tenga todas las dependencias
- Ejecuta `npm install` localmente para verificar

### Error: "Port already in use"
- Cambia el puerto en variables de entorno
- O detén el proceso que usa el puerto

### Error: "CORS policy"
- Verifica la variable `ALLOWED_ORIGINS` en Coolify
- O usa `*` para permitir todos los orígenes (solo desarrollo)

