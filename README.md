# MIR AAL • Avatar IA

Avatar inteligente con análisis facial y detección de emociones en tiempo real.

## Características

- 🎭 **Avatar animado** con transición entre imagen fija y video
- 🎤 **Reconocimiento de voz** para interacción por voz
- 🔊 **Síntesis de voz** (TTS) en español
- 📹 **Análisis facial** en tiempo real
- 😊 **Detección de emociones** (feliz, triste, etc.)
- 💬 **Chat inteligente** con IA (OpenRouter)
- 🎥 **Dos videos** que se alternan según longitud del texto y tema

## Estructura del Proyecto

```
/avatar
  ├── index.html          # Interfaz principal
  ├── style.css           # Estilos (tema oscuro profesional)
  ├── app.js              # Lógica de la aplicación
  ├── assets/
  │   ├── hombre1.jpg     # Imagen fija del avatar
  │   ├── hombrevideo1.mp4 # Video 1 (textos cortos)
  │   └── hombrevideo2.mp4 # Video 2 (textos largos/emociones)
  └── README.md
```

## Configuración

### Desarrollo Local

1. Abre `index.html` en tu navegador
2. Permite el acceso a la cámara cuando se solicite
3. El avatar comenzará a analizar tu entorno automáticamente

### Producción

#### Opción 1: Servidor Node.js
```bash
npm install
npm start
```

#### Opción 2: Docker
```bash
docker build -t mir-avatar .
docker run -p 3000:80 mir-avatar
```

#### Opción 3: Coolify
1. Conecta tu repositorio de GitHub
2. Selecciona "Static Site" como tipo de aplicación
3. Puerto: 3000 (o usa el servidor incluido)
4. La aplicación se desplegará automáticamente

#### Variables de Entorno (Opcional)
Para mayor seguridad, puedes configurar la API key como variable de entorno:
- `OPENROUTER_API_KEY`: Tu API key de OpenRouter

## Tecnologías

- HTML5 / CSS3 / JavaScript Vanilla
- Web Speech API (TTS y reconocimiento de voz)
- OpenRouter API (IA conversacional)
- MediaDevices API (cámara web)
- Canvas API (análisis de imagen)

## Notas

- Requiere navegador moderno (Chrome/Edge recomendado)
- La cámara se activa automáticamente al cargar
- El avatar responde siempre en español
- Los videos están silenciados, solo se usa TTS del texto generado

## Licencia

MIT

