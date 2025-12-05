# MIR AAL • Avatar IA

Avatar inteligente con análisis facial, detección de emociones y reconocimiento de objetos en tiempo real.

## Características

- 🎭 Avatar animado que habla sincronizado con síntesis de voz
- 📹 Análisis facial en tiempo real con detección de emociones
- 👕 Detección de ropa y objetos en el entorno
- 🎤 Reconocimiento de voz para interacción natural
- 💬 Chat con IA usando OpenRouter (Llama 3)
- 🌙 Interfaz oscura profesional estilo Facebook
- 🎥 Avatar a pantalla completa con controles flotantes
- 🔌 Integración con D-ID Live Streaming API

## Tecnologías

- HTML5, CSS3, JavaScript (Vanilla)
- Web Speech API (Reconocimiento y síntesis de voz)
- MediaDevices API (Cámara web)
- Canvas API (Análisis de imagen)
- OpenRouter API (IA conversacional)
- D-ID Live Streaming API (Avatar en tiempo real)
- WebSockets (Comunicación en tiempo real)

## Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/Xangel0s/avatar.git
cd avatar

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo config.env con:
# OPENROUTER_API_KEY=tu_api_key
# OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
# OPENROUTER_APP_URL=http://localhost:3000
# OPENROUTER_APP_NAME=Avatar Realtime Agent

# Configurar D-ID API
# Editar api.json y agregar tu API key de D-ID

# Iniciar servidor local
npm start
```

Abre `http://localhost:3000/ws-streaming` en tu navegador.

## Despliegue en Producción

### Con Docker

```bash
# Construir imagen
docker build -t avatar-ia .

# Ejecutar contenedor
docker run -p 80:80 -e OPENROUTER_API_KEY=tu_api_key avatar-ia
```

### Con Coolify

1. Conecta tu repositorio de GitHub a Coolify
2. Selecciona "Dockerfile" como Build Pack
3. Agrega la variable de entorno:
   - **Nombre**: `OPENROUTER_API_KEY`
   - **Valor**: Tu API key de OpenRouter
4. Deploy!

## Variables de Entorno

- `OPENROUTER_API_KEY`: API key de OpenRouter (requerida)
- `OPENROUTER_MODEL`: Modelo de IA a usar (default: meta-llama/llama-3.1-70b-instruct)
- `OPENROUTER_APP_URL`: URL de la aplicación
- `OPENROUTER_APP_NAME`: Nombre de la aplicación

## Configuración D-ID

Edita el archivo `api.json` y agrega tu API key de D-ID:

```json
{
  "key": "tu_api_key_aqui",
  "url": "https://api.d-id.com",
  "websocketUrl": "wss://ws-api.d-id.com",
  "service": "clips",
  "elevenlabsKey": ""
}
```

## Estructura del Proyecto

```
avatar/
├── index-ws.html              # Interfaz principal con avatar a pantalla completa
├── streaming-client-api-ws.js # Lógica del cliente WebSocket
├── app.js                     # Servidor Express
├── package.json               # Dependencias Node.js
├── config.env                 # Variables de entorno (no incluido en git)
├── api.json                   # Configuración D-ID (no incluido en git)
├── custom-llm-mock/          # Mock de LLM con integración OpenRouter
│   ├── api/
│   │   ├── handlers/llm/
│   │   │   ├── complete.ts
│   │   │   └── stream.ts
│   │   └── lambda.ts
│   └── config.env
└── assets/                    # Recursos multimedia
    ├── hombre1.jpg
    ├── hombrevideo1.mp4
    └── hombrevideo2.mp4
```

## Uso

1. Abre `http://localhost:3000/ws-streaming` en tu navegador
2. El avatar se conectará automáticamente
3. Activa tu cámara web para análisis facial (botón de cámara)
4. Activa el micrófono para reconocimiento de voz (botón de micrófono)
5. Habla con el avatar - analizará tu entorno, ropa y emociones
6. El avatar responderá en español con animación sincronizada

## Características de la Interfaz

- **Avatar a pantalla completa**: Diseño limpio con el avatar ocupando toda la pantalla
- **Controles flotantes**: Botones estilo Facebook Messenger flotando sobre el avatar
- **Todo desactivado por defecto**: El usuario decide qué activar (micrófono, cámara, etc.)
- **Cámara PiP**: Vista previa de la cámara del usuario en la esquina inferior izquierda
- **Bottom Sheet**: Panel de configuración con opciones avanzadas
- **Diseño responsive**: Funciona perfectamente en móvil y desktop

## Requisitos

- Navegador moderno con soporte para:
  - Web Speech API
  - MediaDevices API
  - Canvas API
  - WebSockets
- Cámara web (opcional, para análisis facial)
- Micrófono (opcional, para reconocimiento de voz)
- Node.js >= 14.0.0

## Licencia

MIT

## Autor

Xangel0s
