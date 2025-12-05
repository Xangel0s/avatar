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

// CORS configurado para producción - permitir todos los orígenes
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({ 
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  credentials: true
}));
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
