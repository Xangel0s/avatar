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

1. Abre `index.html` en tu navegador
2. Permite el acceso a la cámara cuando se solicite
3. El avatar comenzará a analizar tu entorno automáticamente

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

