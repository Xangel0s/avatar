# Configuración del Proyecto

## APIs Configuradas

### D-ID API
- ✅ API Key configurada en `api.json`
- Servicio: `clips` (avatar predefinido de alta calidad)

### OpenRouter API
- ✅ API Key configurada en `config.env`
- Modelo: `meta-llama/llama-3.1-70b-instruct`
- App URL: `http://localhost:5173`
- App Name: `Avatar Realtime Agent`

## Archivos Modificados

1. **api.json** - Configurado con la API key de D-ID
2. **custom-llm-mock/api/handlers/llm/stream.ts** - Integrado con OpenRouter para streaming
3. **custom-llm-mock/api/handlers/llm/complete.ts** - Integrado con OpenRouter para completions
4. **custom-llm-mock/api/lambda.ts** - Carga las variables de entorno
5. **app.js** - Carga las variables de entorno desde config.env
6. **config.env** - Archivo de configuración con las variables de OpenRouter

## Cómo Ejecutar

### Servidor Principal
```bash
cd live-streaming-demo
node app.js
```

El servidor se iniciará en `http://localhost:3000`

### Páginas Disponibles
- `http://localhost:3000` - Demo de streaming básico
- `http://localhost:3000/ws-streaming` - Demo de streaming con WebSockets

## Notas Importantes

- El proyecto `custom-llm-mock` es un servicio separado que normalmente se despliega con Serverless Framework
- Para desarrollo local, las variables de entorno se cargan desde `config.env`
- Asegúrate de que Node.js versión 20+ esté instalado para soporte nativo de fetch

