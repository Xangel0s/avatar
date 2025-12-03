# Configuración para Coolify

## Pasos para Desplegar en Coolify

### 1. Conectar Repositorio
- Ve a **Projects** → **Create a new Application**
- Selecciona tu repositorio: `https://github.com/Xangel0s/avatar`
- Branch: `main`

### 2. Configuración de Build
- **Build Pack**: `Nixpacks` (o `Static Site` si prefieres)
- **Base Directory**: `/` (raíz)
- **Build Command**: (dejar vacío para sitio estático)
- **Install Command**: (dejar vacío)

### 3. Configuración de Deploy
- **Port**: `3000` (si usas el servidor Node.js) o `80` (si usas Nginx/Docker)
- **Is it a static site?**: 
  - ✅ **Marcar como Static Site** si quieres usar solo archivos estáticos
  - ❌ **Desmarcar** si quieres usar el servidor Node.js incluido

### 4. Variables de Entorno (Opcional)
Si quieres usar variables de entorno para la API key:
- `OPENROUTER_API_KEY`: Tu API key de OpenRouter

### 5. Opciones Recomendadas

#### Opción A: Sitio Estático (Más Simple)
- Marcar como **Static Site**
- Port: `80` o `3000`
- Coolify servirá los archivos directamente

#### Opción B: Servidor Node.js
- Desmarcar **Static Site**
- Port: `3000`
- Build Command: (vacío)
- Start Command: `node server.js`

#### Opción C: Docker
- Usar el `Dockerfile` incluido
- Coolify detectará automáticamente el Dockerfile
- Port: `80`

## Notas Importantes

- Los archivos de video e imagen están incluidos en el repositorio
- La aplicación funciona completamente en el cliente (navegador)
- No requiere base de datos ni backend adicional
- La API key está en el código (considera usar variables de entorno para producción)

