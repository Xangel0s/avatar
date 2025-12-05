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

const server = http.createServer(app);

server.listen(port, () =>
  console.log(
    `Server started on port localhost:${port}\nhttp://localhost:${port}\nhttp://localhost:${port}/ws-streaming`
  )
);
