# MIR AAL • Avatar IA

Avatar inteligente con análisis facial, detección de emociones y reconocimiento de objetos en tiempo real.

## Características

- 🎭 Avatar animado que habla sincronizado con síntesis de voz
- 📹 Análisis facial en tiempo real con detección de emociones
- 👕 Detección de ropa y objetos en el entorno
- 🎤 Reconocimiento de voz para interacción natural
- 💬 Chat con IA usando OpenRouter (Llama 3)
- 🌙 Interfaz oscura profesional

## Tecnologías

- HTML5, CSS3, JavaScript (Vanilla)
- Web Speech API (Reconocimiento y síntesis de voz)
- MediaDevices API (Cámara web)
- Canvas API (Análisis de imagen)
- OpenRouter API (IA conversacional)

## Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/Xangel0s/avatar.git
cd avatar

# Instalar dependencias (opcional, solo para desarrollo)
npm install

# Iniciar servidor local
npm start
```

Abre `http://localhost:3000` en tu navegador.

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

## Estructura del Proyecto

```
avatar/
├── index.html          # Estructura HTML
├── style.css           # Estilos
├── app.js              # Lógica principal
├── server.js           # Servidor Node.js (desarrollo)
├── Dockerfile          # Configuración Docker
├── .nginx.conf         # Configuración Nginx
├── package.json        # Dependencias Node.js
└── assets/            # Recursos multimedia
    ├── hombre1.jpg
    ├── hombrevideo1.mp4
    └── hombrevideo2.mp4
```

## Uso

1. Activa tu cámara web para análisis facial
2. Escribe o habla con el avatar usando el micrófono
3. El avatar analizará tu entorno, ropa y emociones
4. MIR responderá en español con animación sincronizada

## Requisitos

- Navegador moderno con soporte para:
  - Web Speech API
  - MediaDevices API
  - Canvas API
- Cámara web (opcional, para análisis facial)
- Micrófono (opcional, para reconocimiento de voz)

## Licencia

MIT

## Autor

Xangel0s
