require('dotenv').config({ path: './config.env' });
const express = require('express');
const http = require('http');
const cors = require('cors');
const RateLimit = require('express-rate-limit');
const port = process.env.PORT || 3000;

const app = express();

// Rate limiter solo para rutas específicas, no para archivos estáticos
var limiter = RateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // Aumentar límite
  skip: (req) => {
    // No aplicar rate limit a archivos estáticos
    return req.path.includes('.js') || 
           req.path.includes('.css') || 
           req.path.includes('.png') || 
           req.path.includes('.jpg') || 
           req.path.includes('.mp4') ||
           req.path.includes('.ico') ||
           req.path.includes('.json');
  }
});

// CORS configurado para producción
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({ 
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  credentials: true,
  // Asegurar que funcione con HTTPS
  optionsSuccessStatus: 200
}));

// Headers de seguridad para HTTPS
app.use((req, res, next) => {
  // Si la solicitud viene por HTTPS, asegurar headers de seguridad
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
  }
  next();
});
app.use('/', express.static(__dirname));

// Aplicar rate limiter solo a rutas HTML
app.use('/', limiter);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/ws-streaming', function (req, res) {
  res.sendFile(__dirname + '/index-ws.html');
});

// Health check endpoint para Coolify
app.get('/health', function (req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const server = http.createServer(app);

// CRÍTICO: Escuchar en 0.0.0.0 para que Traefik pueda conectarse desde fuera del contenedor
const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
  console.log(`✅ Server started on ${host}:${port}`);
  console.log(`📡 Health check: http://${host}:${port}/health`);
  console.log(`🌐 Main app: http://${host}:${port}/`);
  console.log(`🎥 WebSocket streaming: http://${host}:${port}/ws-streaming`);
  
  // Si ngrok está configurado, mostrar URL después de unos segundos
  if (process.env.NGROK_AUTHTOKEN) {
    setTimeout(() => {
      fetch('http://localhost:4040/api/tunnels')
        .then(res => res.json())
        .then(data => {
          if (data.tunnels && data.tunnels.length > 0) {
            const ngrokUrl = data.tunnels[0].public_url;
            console.log(`\n🚀 Ngrok URL: ${ngrokUrl}`);
            console.log(`🌐 Accede a tu aplicación en: ${ngrokUrl}`);
            console.log(`🎥 WebSocket streaming en: ${ngrokUrl}/ws-streaming`);
          }
        })
        .catch(() => {
          // Ngrok aún no está listo o no está corriendo
        });
    }, 5000);
  }
});
