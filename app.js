// Configuración
const CONFIG = {
  // API Key de OpenRouter - desde variable de entorno o fallback
  openRouterKey: window.OPENROUTER_API_KEY || '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',
  model: 'meta-llama/llama-3-8b-instruct',
  useWebSpeechTTS: true,
  videoGenEndpoint: 'https://api-avatar.edvio.app/generate',
  cameraAnalysisInterval: 2000,
  useVideoAudio: true
};

const systemPrompt = `Eres MIR, un asistente de IA. Responde siempre en español.

Cuando detectes emociones en el usuario a través de la cámara (como sonrisa, expresión triste, etc.), 
pregúntale de forma natural y empática sobre cómo se siente. Por ejemplo: "Veo que estás sonriendo, 
¿te sientes bien?" o "Noto que pareces preocupado, ¿hay algo en lo que pueda ayudarte?".`;

// Referencias DOM
const avatarIdle = document.getElementById('avatarIdle');
const avatarVideo1 = document.getElementById('avatarVideo1');
const avatarVideo2 = document.getElementById('avatarVideo2');
let currentVideo = null; // Video actualmente activo
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const btnSend = document.getElementById('btnSend');
const btnMic = document.getElementById('btnMic');
const btnToggleCamera = document.getElementById('btnToggleCamera');
const userCamera = document.getElementById('userCamera');
const cameraCanvas = document.getElementById('cameraCanvas');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const cameraStatus = document.getElementById('cameraStatus');
const envStatus = document.getElementById('envStatus');
const environmentInfo = document.getElementById('environmentInfo');
const overlayCanvas = document.getElementById('overlayCanvas');
const faceAnalysis = document.getElementById('faceAnalysis');

// Estado de la aplicación
let messages = [{ role: 'system', content: systemPrompt }];
let cameraStream = null;
let cameraActive = false;
let analysisInterval = null;
let environmentContext = {
  faceDetected: false,
  movement: false,
  brightness: 0,
  lastUpdate: null,
  faces: [],
  objects: [],
  expressions: {},
  detectedEmotion: null // Emoción detectada (feliz, triste, neutral, etc.)
};

// Modelos de ML
let faceModel = null;
let modelsLoaded = false;

// Estado de voz - Reconocimiento (escuchar)
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;
}

// Estado de voz - Síntesis (hablar)
let synth = window.speechSynthesis;
let isSpeaking = false;
let isListening = false; // Estado del reconocimiento de voz

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await loadMLModels();
  initializeCamera();
  setupEventListeners();
  checkVideoAudio();
});

// Cargar modelos de ML
async function loadMLModels() {
  try {
    faceAnalysis.textContent = 'Activo';
    modelsLoaded = true;
  } catch (error) {
    console.error('Error cargando modelos:', error);
    faceAnalysis.textContent = 'Error';
  }
}

function setupEventListeners() {
  btnSend.addEventListener('click', handleSend);
  btnToggleCamera.addEventListener('click', toggleCamera);
  
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  if (recognition) {
    btnMic.addEventListener('click', handleVoiceInput);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInput.value = transcript;
      btnMic.classList.remove('listening');
      isListening = false;
      setTimeout(() => handleSend(), 300);
    };
    recognition.onerror = (event) => {
      console.error('Error de reconocimiento:', event.error);
      btnMic.classList.remove('listening');
      isListening = false;
      // Si el error es "no-speech", no hacer nada (es normal)
      if (event.error !== 'no-speech') {
        // Para otros errores, intentar detener si está activo
        try {
          recognition.stop();
        } catch (e) {
          // Ignorar errores al detener
        }
      }
    };
    recognition.onend = () => {
      btnMic.classList.remove('listening');
      isListening = false;
    };
  } else {
    btnMic.style.opacity = '0.5';
    btnMic.title = 'Reconocimiento de voz no disponible en este navegador';
  }
}

// Funciones de cámara
async function initializeCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'user'
      } 
    });
    cameraStream = stream;
    userCamera.srcObject = stream;
    cameraActive = true;
    cameraPlaceholder.style.display = 'none';
    btnToggleCamera.classList.add('active');
    cameraStatus.textContent = 'Cámara: Activada';
    startEnvironmentAnalysis();
  } catch (error) {
    console.error('Error accediendo a la cámara:', error);
    cameraStatus.textContent = 'Cámara: Error de acceso';
    envStatus.textContent = 'Cámara no disponible';
  }
}

function toggleCamera() {
  if (cameraActive) {
    stopCamera();
  } else {
    initializeCamera();
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraActive = false;
  userCamera.srcObject = null;
  cameraPlaceholder.style.display = 'flex';
  btnToggleCamera.classList.remove('active');
  cameraStatus.textContent = 'Cámara: Desactivada';
  envStatus.textContent = 'Cámara desactivada';
  stopEnvironmentAnalysis();
}

// Análisis del entorno
function startEnvironmentAnalysis() {
  if (analysisInterval) clearInterval(analysisInterval);
  
  analysisInterval = setInterval(() => {
    if (cameraActive && userCamera.readyState === 4) {
      analyzeEnvironment();
    }
  }, CONFIG.cameraAnalysisInterval);
  
  // Análisis inicial
  setTimeout(() => analyzeEnvironment(), 500);
}

function stopEnvironmentAnalysis() {
  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
  }
}

async function analyzeEnvironment() {
  if (!cameraActive || !userCamera.videoWidth) return;
  if (!modelsLoaded) return;
  
  try {
    const ctx = cameraCanvas.getContext('2d', { willReadFrequently: true });
    cameraCanvas.width = userCamera.videoWidth;
    cameraCanvas.height = userCamera.videoHeight;
    ctx.drawImage(userCamera, 0, 0);
    
    // Configurar overlay canvas
    overlayCanvas.width = userCamera.videoWidth;
    overlayCanvas.height = userCamera.videoHeight;
    
    const imageData = ctx.getImageData(0, 0, cameraCanvas.width, cameraCanvas.height);
    const basicAnalysis = performBasicAnalysis(imageData);
    
    // Análisis facial básico
    let faceData = [];
    
    if (faceModel) {
      try {
        faceData = await performFaceDetection();
      } catch (err) {
        console.warn('Error en detección facial:', err);
      }
    }
    
    environmentContext = {
      ...basicAnalysis,
      faces: faceData,
      objects: basicAnalysis.objects || {},
      lastUpdate: new Date()
    };
    
    // Dibujar detecciones en overlay (solo caras)
    drawDetections(faceData, []);
    
    // Actualizar UI
    updateEnvironmentUI(basicAnalysis, faceData, basicAnalysis.objects);
    
    // Enviar contexto al sistema si hay cambios significativos
    if (basicAnalysis.faceDetected && !messages.find(m => m.role === 'system' && m.content.includes('cámara activa'))) {
      addEnvironmentContextToSystem();
    }
  } catch (error) {
    console.error('Error analizando entorno:', error);
  }
}

// Detección facial básica (sin BlazeFace por ahora)
async function performFaceDetection() {
  // Retornar array vacío - usando solo detección básica por color de piel
  return [];
}

// Analizar expresiones faciales basadas en landmarks
function analyzeFacialExpressions(landmarks, start, size) {
  if (!landmarks || landmarks.length < 6) return {};
  
  // Landmarks de BlazeFace: [ojos, nariz, boca, oídos]
  // Índices aproximados: 0-1 ojos, 2 nariz, 3-4 boca, 5-6 oídos
  
  const expressions = {
    smiling: false,
    eyesOpen: true,
    headTurn: 'center',
    attention: 'focused'
  };
  
  // Análisis básico de sonrisa (distancia entre esquinas de boca)
  if (landmarks.length >= 4) {
    const mouthLeft = landmarks[3];
    const mouthRight = landmarks[4];
    const mouthWidth = Math.abs(mouthRight[0] - mouthLeft[0]);
    const faceWidth = size[0];
    expressions.smiling = (mouthWidth / faceWidth) > 0.15;
  }
  
  // Análisis de apertura de ojos
  if (landmarks.length >= 2) {
    const eyeLeft = landmarks[0];
    const eyeRight = landmarks[1];
    const eyeDistance = Math.abs(eyeRight[0] - eyeLeft[0]);
    expressions.eyesOpen = eyeDistance > 0;
  }
  
  // Análisis de giro de cabeza (basado en posición de nariz)
  if (landmarks.length >= 3) {
    const nose = landmarks[2];
    const faceCenterX = start[0] + size[0] / 2;
    const noseOffset = nose[0] - faceCenterX;
    const turnRatio = noseOffset / (size[0] / 2);
    
    if (turnRatio > 0.2) expressions.headTurn = 'right';
    else if (turnRatio < -0.2) expressions.headTurn = 'left';
    else expressions.headTurn = 'center';
  }
  
  return expressions;
}


// Dibujar detecciones en overlay (solo caras)
function drawDetections(faces, objects) {
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  
  // Dibujar caras si están disponibles
  if (faces && faces.length > 0) {
    faces.forEach(face => {
      if (face.bbox) {
        const { x, y, width, height } = face.bbox;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Dibujar puntos de landmarks
        if (face.landmarks) {
          ctx.fillStyle = '#00ff00';
          face.landmarks.forEach(landmark => {
            ctx.beginPath();
            ctx.arc(landmark[0], landmark[1], 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
      }
    });
  }
}

function performBasicAnalysis(imageData) {
  const data = imageData.data;
  let totalBrightness = 0;
  let pixelCount = 0;
  let faceDetected = false;
  let movement = false;
  
  // Análisis básico de brillo y detección de movimiento
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    pixelCount++;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  
  // Detección básica de cara (basada en patrones de color de piel)
  const skinTonePixels = countSkinTonePixels(data);
  faceDetected = skinTonePixels > (pixelCount * 0.1);
  
  // Análisis de objetos y ropa
  const objectAnalysis = analyzeObjectsAndClothing(data, imageData.width, imageData.height);
  
  return {
    faceDetected,
    movement,
    brightness: Math.round(avgBrightness),
    skinToneRatio: (skinTonePixels / pixelCount * 100).toFixed(1),
    objects: objectAnalysis
  };
}

// Analizar objetos y ropa en la imagen
function analyzeObjectsAndClothing(data, width, height) {
  const objects = {
    clothing: {
      detected: false,
      colors: [],
      types: [],
      details: []
    },
    background: {
      detected: false,
      color: null,
      type: null
    },
    items: [],
    environment: {
      lighting: 'normal',
      objects: []
    }
  };
  
  // Dividir la imagen en regiones más precisas
  const headRegion = Math.floor(height * 0.25); // 25% superior (cabeza)
  const upperBodyRegion = Math.floor(height * 0.45); // 20% siguiente (torso/ropa superior)
  const lowerBodyRegion = Math.floor(height * 0.75); // 30% siguiente (cintura/ropa inferior)
  // 25% inferior = fondo
  
  let headColors = [];
  let upperBodyColors = [];
  let lowerBodyColors = [];
  let backgroundColors = [];
  let edgeColors = []; // Colores en los bordes (probablemente fondo)
  
  // Analizar diferentes regiones con muestreo más eficiente
  const sampleRate = 2; // Analizar cada 2 píxeles para mejor rendimiento
  
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      
      // Excluir píxeles muy oscuros o muy brillantes (probablemente ruido)
      if (brightness < 10 || brightness > 245) continue;
      
      const color = { r, g, b, brightness };
      
      // Región de cabeza (excluir si es tono de piel)
      if (y < headRegion) {
        if (!isSkinTone(r, g, b)) {
          headColors.push(color);
        }
      }
      // Región superior del cuerpo (ropa superior)
      else if (y >= headRegion && y < upperBodyRegion) {
        if (!isSkinTone(r, g, b)) {
          upperBodyColors.push(color);
        }
      }
      // Región inferior del cuerpo (ropa inferior)
      else if (y >= upperBodyRegion && y < lowerBodyRegion) {
        if (!isSkinTone(r, g, b)) {
          lowerBodyColors.push(color);
        }
      }
      // Región inferior (fondo)
      else {
        backgroundColors.push(color);
      }
      
      // Detectar bordes (probablemente fondo)
      if (x < width * 0.1 || x > width * 0.9 || y > height * 0.9) {
        edgeColors.push(color);
      }
    }
  }
  
  // Analizar colores dominantes con validación mejorada
  const upperDominant = getDominantColorValidated(upperBodyColors, 'ropa superior');
  const lowerDominant = getDominantColorValidated(lowerBodyColors, 'ropa inferior');
  const backgroundDominant = getDominantColorValidated(backgroundColors, 'fondo');
  const edgeDominant = getDominantColorValidated(edgeColors, 'borde');
  
  // Detectar ropa superior con validación mejorada
  if (upperDominant && isValidClothingColor(upperDominant)) {
    const colorName = getColorName(upperDominant.r, upperDominant.g, upperDominant.b);
    objects.clothing.detected = true;
    objects.clothing.colors.push(colorName);
    objects.clothing.types.push('superior');
    objects.clothing.details.push({
      type: 'superior',
      color: colorName,
      rgb: { r: upperDominant.r, g: upperDominant.g, b: upperDominant.b }
    });
    objects.items.push(`Ropa superior: ${colorName}`);
  }
  
  // Detectar ropa inferior con validación mejorada
  if (lowerDominant && isValidClothingColor(lowerDominant)) {
    const colorName = getColorName(lowerDominant.r, lowerDominant.g, lowerDominant.b);
    objects.clothing.detected = true;
    if (!objects.clothing.colors.includes(colorName)) {
      objects.clothing.colors.push(colorName);
    }
    objects.clothing.types.push('inferior');
    objects.clothing.details.push({
      type: 'inferior',
      color: colorName,
      rgb: { r: lowerDominant.r, g: lowerDominant.g, b: lowerDominant.b }
    });
    objects.items.push(`Ropa inferior: ${colorName}`);
  }
  
  // Detectar fondo (usar colores de borde si están disponibles)
  const finalBackground = edgeDominant || backgroundDominant;
  if (finalBackground) {
    const bgColorName = getColorName(finalBackground.r, finalBackground.g, finalBackground.b);
    objects.background.detected = true;
    objects.background.color = bgColorName;
    objects.background.type = getBackgroundType(finalBackground);
    objects.items.push(`Fondo: ${bgColorName} (${objects.background.type})`);
  }
  
  // Analizar entorno y objetos
  analyzeEnvironment(data, width, height, objects);
  
  return objects;
}

// Obtener color dominante de un array de colores con validación mejorada
function getDominantColorValidated(colors, regionType) {
  if (colors.length === 0) return null;
  
  // Filtrar colores inválidos (demasiado oscuros, brillantes, o tonos de piel)
  const validColors = colors.filter(color => {
    // Excluir tonos de piel
    if (isSkinTone(color.r, color.g, color.b)) return false;
    // Excluir colores muy oscuros o muy brillantes (probablemente ruido)
    if (color.brightness < 20 || color.brightness > 240) return false;
    return true;
  });
  
  if (validColors.length === 0) return null;
  
  // Agrupar colores similares con mejor precisión
  const colorGroups = {};
  const tolerance = 24; // Tolerancia para agrupar colores similares
  
  validColors.forEach(color => {
    // Buscar grupo existente similar
    let foundGroup = false;
    for (const key in colorGroups) {
      const [r, g, b] = key.split('-').map(Number);
      if (Math.abs(color.r - r) < tolerance &&
          Math.abs(color.g - g) < tolerance &&
          Math.abs(color.b - b) < tolerance) {
        colorGroups[key].count++;
        colorGroups[key].r += color.r;
        colorGroups[key].g += color.g;
        colorGroups[key].b += color.b;
        foundGroup = true;
        break;
      }
    }
    
    // Si no se encontró grupo, crear uno nuevo
    if (!foundGroup) {
      const key = `${Math.floor(color.r / tolerance) * tolerance}-${Math.floor(color.g / tolerance) * tolerance}-${Math.floor(color.b / tolerance) * tolerance}`;
      if (!colorGroups[key]) {
        colorGroups[key] = { count: 0, r: 0, g: 0, b: 0 };
      }
      colorGroups[key].count++;
      colorGroups[key].r += color.r;
      colorGroups[key].g += color.g;
      colorGroups[key].b += color.b;
    }
  });
  
  // Encontrar el grupo más común (debe tener al menos 5% de los píxeles)
  const minPixels = Math.max(validColors.length * 0.05, 10);
  let maxCount = 0;
  let dominant = null;
  
  Object.keys(colorGroups).forEach(key => {
    const group = colorGroups[key];
    if (group.count >= minPixels && group.count > maxCount) {
      maxCount = group.count;
      dominant = {
        r: Math.round(group.r / group.count),
        g: Math.round(group.g / group.count),
        b: Math.round(group.b / group.count),
        confidence: group.count / validColors.length
      };
    }
  });
  
  return dominant;
}

// Validar si un color es válido para ropa (excluye tonos de piel y colores extremos)
function isValidClothingColor(color) {
  if (!color) return false;
  
  // Excluir tonos de piel
  if (isSkinTone(color.r, color.g, color.b)) return false;
  
  // Excluir colores muy oscuros o muy brillantes (probablemente ruido o iluminación)
  const brightness = (color.r + color.g + color.b) / 3;
  if (brightness < 25 || brightness > 235) return false;
  
  // Debe tener suficiente saturación (no ser completamente gris)
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  // Aceptar colores con algo de saturación o grises medios
  return saturation > 0.1 || (brightness > 50 && brightness < 200);
}

// Nombrar color aproximado con mejor precisión
function getColorName(r, g, b) {
  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  // Colores muy oscuros
  if (brightness < 40) {
    if (saturation < 0.2) return 'negro';
    // Determinar color oscuro
    if (r > g && r > b) return 'rojo muy oscuro';
    if (g > r && g > b) return 'verde muy oscuro';
    if (b > r && b > g) return 'azul muy oscuro';
    return 'negro';
  }
  
  // Colores muy claros
  if (brightness > 220) {
    if (saturation < 0.2) return 'blanco';
    // Determinar color claro
    if (r > g && r > b) return 'rosa claro';
    if (g > r && g > b) return 'verde muy claro';
    if (b > r && b > g) return 'azul muy claro';
    return 'blanco';
  }
  
  // Grises
  if (saturation < 0.15) {
    if (brightness < 80) return 'gris muy oscuro';
    if (brightness < 120) return 'gris oscuro';
    if (brightness < 180) return 'gris';
    return 'gris claro';
  }
  
  // Colores saturados
  const deltaR = r - (g + b) / 2;
  const deltaG = g - (r + b) / 2;
  const deltaB = b - (r + g) / 2;
  
  // Rojos
  if (r > g && r > b) {
    if (r > 200 && brightness > 180) return 'rojo claro';
    if (r > 180) return 'rojo';
    if (r > 140) return 'rojo oscuro';
    return 'rojo muy oscuro';
  }
  
  // Verdes
  if (g > r && g > b) {
    if (g > 200 && brightness > 180) return 'verde claro';
    if (g > 180) return 'verde';
    if (g > 140) return 'verde oscuro';
    return 'verde muy oscuro';
  }
  
  // Azules
  if (b > r && b > g) {
    if (b > 200 && brightness > 180) return 'azul claro';
    if (b > 180) return 'azul';
    if (b > 140) return 'azul oscuro';
    return 'azul muy oscuro';
  }
  
  // Colores secundarios
  if (r > 150 && g > 100 && g < r) {
    if (brightness > 180) return 'naranja claro';
    return 'naranja';
  }
  
  if (r > 120 && b > 120 && Math.abs(r - b) < 30) {
    if (brightness > 180) return 'morado claro';
    return 'morado';
  }
  
  if (g > 120 && b > 120 && Math.abs(g - b) < 30) {
    if (brightness > 180) return 'cian claro';
    return 'cian';
  }
  
  if (r > 180 && g > 100 && b < 100) {
    return 'amarillo';
  }
  
  // Color mixto
  return 'multicolor';
}

// Obtener tipo de fondo
function getBackgroundType(color) {
  const brightness = (color.r + color.g + color.b) / 3;
  if (brightness < 60) return 'oscuro';
  if (brightness > 200) return 'claro';
  return 'medio';
}

// Verificar si es tono de piel
function isSkinTone(r, g, b) {
  return (r > 95 && g > 40 && b > 20 && 
          r > g && g > b && 
          Math.max(r, g, b) - Math.min(r, g, b) > 15);
}

// Analizar entorno completo (objetos, iluminación, etc.)
function analyzeEnvironment(data, width, height, objects) {
  // Analizar iluminación general
  let totalBrightness = 0;
  let pixelCount = 0;
  let brightPixels = 0;
  let darkPixels = 0;
  
  // Analizar contraste y objetos
  const contrastThreshold = 40;
  let highContrastAreas = 0;
  let edgeContrast = 0;
  const sampleRate = 3;
  
  // Analizar diferentes zonas
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      
      totalBrightness += brightness;
      pixelCount++;
      
      if (brightness > 200) brightPixels++;
      if (brightness < 50) darkPixels++;
      
      // Analizar contraste con píxeles adyacentes
      if (x < width - sampleRate && y < height - sampleRate) {
        const rightIdx = (y * width + (x + sampleRate)) * 4;
        const rightR = data[rightIdx];
        const rightG = data[rightIdx + 1];
        const rightB = data[rightIdx + 2];
        
        const contrast = Math.abs(r - rightR) + Math.abs(g - rightG) + Math.abs(b - rightB);
        
        if (contrast > contrastThreshold) {
          highContrastAreas++;
        }
        
        // Contraste en bordes (indica objetos)
        if (x < width * 0.15 || x > width * 0.85) {
          edgeContrast += contrast;
        }
      }
    }
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  const brightRatio = brightPixels / pixelCount;
  const darkRatio = darkPixels / pixelCount;
  
  // Determinar tipo de iluminación
  if (avgBrightness > 180) {
    objects.environment.lighting = 'muy claro';
  } else if (avgBrightness > 140) {
    objects.environment.lighting = 'claro';
  } else if (avgBrightness < 80) {
    objects.environment.lighting = 'oscuro';
  } else if (avgBrightness < 110) {
    objects.environment.lighting = 'poco iluminado';
  }
  
  // Detectar objetos por contraste
  const contrastRatio = highContrastAreas / (pixelCount / (sampleRate * sampleRate));
  if (contrastRatio > 0.15) {
    objects.environment.objects.push('Objetos con contraste detectados');
  }
  
  // Detectar posibles objetos en el entorno
  if (edgeContrast > 5000) {
    objects.environment.objects.push('Elementos visibles en el entorno');
  }
  
  // Agregar información de iluminación
  if (objects.environment.lighting !== 'normal') {
    objects.items.push(`Iluminación: ${objects.environment.lighting}`);
  }
  
  // Agregar objetos detectados
  objects.environment.objects.forEach(obj => {
    if (!objects.items.includes(obj)) {
      objects.items.push(obj);
    }
  });
}

function countSkinTonePixels(data) {
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Detección básica de tonos de piel (rango aproximado)
    if (r > 95 && g > 40 && b > 20 && 
        r > g && g > b && 
        Math.max(r, g, b) - Math.min(r, g, b) > 15) {
      count++;
    }
  }
  return count;
}

function updateEnvironmentUI(analysis, faces, objects) {
  if (faces && faces.length > 0) {
    envStatus.textContent = `${faces.length} ${faces.length === 1 ? 'persona' : 'personas'} detectada${faces.length > 1 ? 's' : ''}`;
    envStatus.style.color = 'var(--accent-success)';
  } else if (analysis.faceDetected) {
    envStatus.textContent = 'Persona detectada';
    envStatus.style.color = 'var(--accent-success)';
  } else {
    envStatus.textContent = 'Analizando...';
    envStatus.style.color = 'var(--text-secondary)';
  }
  
  // Actualizar información básica con mejor detalle
  const clothingInfo = analysis.objects?.clothing?.detected 
    ? analysis.objects.clothing.colors.join(', ')
    : 'No detectada';
  
  const lightingInfo = analysis.objects?.environment?.lighting || 'normal';
  const lightingEmoji = lightingInfo === 'muy claro' ? '☀️' : 
                        lightingInfo === 'claro' ? '☀️' : 
                        lightingInfo === 'oscuro' ? '🌙' : 
                        lightingInfo === 'poco iluminado' ? '💡' : '✨';
  
  const infoHTML = `
    <div class="info-item">
      <span class="info-label">Estado:</span>
      <span class="info-value">${faces && faces.length > 0 ? `${faces.length} persona(s)` : analysis.faceDetected ? 'Persona detectada' : 'Buscando...'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Brillo:</span>
      <span class="info-value">${analysis.brightness > 128 ? 'Bueno' : analysis.brightness > 90 ? 'Moderado' : 'Bajo'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Iluminación:</span>
      <span class="info-value">${lightingEmoji} ${lightingInfo}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Ropa:</span>
      <span class="info-value">${clothingInfo}</span>
    </div>
    ${analysis.objects?.background?.detected ? `
    <div class="info-item">
      <span class="info-label">Fondo:</span>
      <span class="info-value">${analysis.objects.background.color} (${analysis.objects.background.type})</span>
    </div>
    ` : ''}
  `;
  environmentInfo.innerHTML = infoHTML;
  
  // Actualizar análisis facial
  if (faces && faces.length > 0) {
    let faceHTML = '';
    faces.forEach((face, index) => {
      const expr = face.expressions || {};
      faceHTML += `
        <div class="face-feature">
          <span class="face-feature-label">Cara ${index + 1}:</span>
          <span class="face-feature-value">Confianza ${((face.confidence || 0.9) * 100).toFixed(0)}%</span>
        </div>
        ${expr.smiling ? '<span class="analysis-tag high-confidence">😊 Sonriendo</span>' : ''}
        ${expr.headTurn !== 'center' ? `<span class="analysis-tag">👤 Mirando ${expr.headTurn === 'left' ? 'izquierda' : 'derecha'}</span>` : ''}
        ${expr.eyesOpen ? '<span class="analysis-tag">👁️ Ojos abiertos</span>' : '<span class="analysis-tag">😴 Ojos cerrados</span>'}
      `;
    });
    faceAnalysis.innerHTML = faceHTML || 'Sin caras detectadas';
  } else {
    faceAnalysis.innerHTML = analysis.faceDetected ? 'Persona detectada' : 'Sin caras detectadas';
  }
  
  // Mostrar objetos detectados con mejor formato
  const objectSection = document.getElementById('objectAnalysis');
  if (objectSection) {
    if (analysis.objects && analysis.objects.items.length > 0) {
      // Agrupar información de ropa si está disponible
      let objectsHTML = '';
      
      if (analysis.objects.clothing && analysis.objects.clothing.detected) {
        analysis.objects.clothing.details.forEach(detail => {
          objectsHTML += `<span class="analysis-tag high-confidence">👕 ${detail.type}: ${detail.color}</span>`;
        });
      }
      
      // Agregar otros objetos detectados
      analysis.objects.items.forEach(item => {
        // Evitar duplicados de ropa
        if (!item.includes('Ropa') && !item.includes('Fondo')) {
          const emoji = item.includes('Iluminación') ? '💡' : 
                       item.includes('Objetos') ? '📦' : 
                       item.includes('Elementos') ? '🔍' : '📋';
          objectsHTML += `<span class="analysis-tag">${emoji} ${item}</span>`;
        }
      });
      
      // Agregar información de fondo si está disponible
      if (analysis.objects.background && analysis.objects.background.detected) {
        objectsHTML += `<span class="analysis-tag">🖼️ Fondo: ${analysis.objects.background.color}</span>`;
      }
      
      objectSection.innerHTML = objectsHTML || '<span class="analysis-tag">Analizando entorno...</span>';
    } else {
      objectSection.innerHTML = '<span class="analysis-tag">Sin objetos detectados</span>';
    }
  }
}

function addEnvironmentContextToSystem() {
  const facesInfo = environmentContext.faces.length > 0 
    ? `${environmentContext.faces.length} persona(s) detectada(s). ${environmentContext.faces[0].expressions?.smiling ? 'La persona está sonriendo (parece feliz).' : ''}`
    : 'Persona detectada.';
  
  const emotionInfo = environmentContext.detectedEmotion 
    ? `Emoción detectada: ${environmentContext.detectedEmotion}.`
    : '';
  
  // Información de ropa y objetos
  let clothingInfo = '';
  if (environmentContext.objects && environmentContext.objects.clothing && environmentContext.objects.clothing.detected) {
    const colors = environmentContext.objects.clothing.colors.join(', ');
    clothingInfo = `Ropa detectada: ${colors}. `;
  }
  
  const objectsInfo = environmentContext.objects && environmentContext.objects.items.length > 0
    ? `Objetos en el entorno: ${environmentContext.objects.items.join(', ')}. `
    : '';
  
  const contextMessage = `[CONTEXTO DE CÁMARA] La cámara del usuario está activa. ${facesInfo} ${emotionInfo} ${clothingInfo}${objectsInfo}
  El sistema puede analizar el entorno visual en tiempo real incluyendo ropa, objetos y expresiones faciales.
  Si detectas emociones (feliz, triste, preocupado, etc.), pregunta al usuario de forma empática cómo se siente.
  Puedes comentar sobre la ropa que lleva el usuario si es relevante para la conversación.`;
  
  // Agregar contexto al último mensaje del sistema o crear uno nuevo
  const systemMsgIndex = messages.findIndex(m => m.role === 'system');
  if (systemMsgIndex >= 0) {
    messages[systemMsgIndex].content += '\n\n' + contextMessage;
  }
}

// Funciones principales
async function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage('user', text);
  userInput.value = '';
  
  // Agregar contexto del entorno si la cámara está activa
  let userMessage = text;
  if (cameraActive && environmentContext.faces.length > 0) {
    const face = environmentContext.faces[0];
    const expr = face.expressions || {};
    const expressions = [];
    let emotion = null;
    
    if (expr.smiling) {
      expressions.push('sonriendo');
      emotion = 'feliz';
    }
    if (expr.headTurn !== 'center') expressions.push(`mirando ${expr.headTurn === 'left' ? 'izquierda' : 'derecha'}`);
    if (!expr.eyesOpen) emotion = 'cansado';
    
    environmentContext.detectedEmotion = emotion;
    
    userMessage += ` [Usuario frente a cámara${expressions.length > 0 ? ', ' + expressions.join(', ') : ''}${emotion ? ', parece ' + emotion : ''}.]`;
  }
  
  messages.push({ role: 'user', content: userMessage });

  try {
    // Validar que la API key esté presente
    if (!CONFIG.openRouterKey || CONFIG.openRouterKey === '') {
      throw new Error('API Key de OpenRouter no configurada. Por favor, configura tu API key.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin || 'https://github.com/Xangel0s/avatar',
        'X-Title': 'MIR Avatar IA'
      },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Error ${response.status}`;
      
      // Mensajes de error más claros
      if (response.status === 401) {
        throw new Error('API Key inválida o expirada. Por favor, verifica tu API key de OpenRouter en https://openrouter.ai/keys');
      } else if (response.status === 429) {
        throw new Error('Límite de solicitudes excedido. Por favor, intenta más tarde.');
      } else {
        throw new Error(`Error de API: ${errorMessage}`);
      }
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Respuesta inválida de la API');
    }
    
    let botReply = data.choices[0].message.content || 'Lo siento, no pude generar una respuesta.';
    
    // Validar que la respuesta esté en español
    const englishWords = /\b(hello|hi|the|and|or|but|is|are|was|were|you|your|this|that|what|how|when|where|why|can|could|should|will|would|yes|no|ok|okay|thanks|thank|please|sorry|I|me|my|we|our|they|them|their|here|there|hello|hi|hey|good|bad|nice|great|fine|well|sure|maybe|probably|definitely|absolutely|exactly|right|wrong|correct|incorrect|true|false|yes|no|okay|ok|alright|all right|of course|certainly|definitely|sure|maybe|perhaps|probably|likely|unlikely|possible|impossible|probably|definitely|absolutely|exactly|right|wrong|correct|incorrect|true|false)\b/gi;
    const spanishWords = /\b(el|la|los|las|un|una|es|son|está|están|tú|tu|tus|nosotros|nos|ellos|ellas|con|por|para|de|del|que|qué|cómo|cuándo|dónde|por qué|sí|no|gracias|por favor|perdón|hola|adiós|buenos días|buenas tardes|buenas noches|claro|exacto|correcto|incorrecto|verdad|falso|cierto|ciertamente|definitivamente|absolutamente|exactamente|probablemente|posiblemente|tal vez|quizás|seguro|seguramente|mejor|peor|bueno|malo|bien|mal|grande|pequeño|mucho|poco|más|menos|muy|bastante|demasiado|también|tampoco|además|incluso|aunque|pero|sin embargo|porque|ya que|mientras|cuando|donde|como|quien|que|cuál|cuales|cuánto|cuánta|cuántos|cuántas|este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas|mío|mía|míos|mías|tuyo|tuya|tuyos|tuyas|suyo|suya|suyos|suyas|nuestro|nuestra|nuestros|nuestras|vuestro|vuestra|vuestros|vuestras)\b/gi;
    
    const englishCount = (botReply.match(englishWords) || []).length;
    const spanishCount = (botReply.match(spanishWords) || []).length;
    
    // Si hay más palabras en inglés que en español, pedir traducción
    if (englishCount > spanishCount && englishCount > 2) {
      console.warn('Respuesta detectada en inglés, solicitando traducción...');
      
      // Agregar mensaje de sistema pidiendo traducción
      const translationRequest = [
        ...messages,
        { role: 'assistant', content: botReply },
        { role: 'user', content: 'La respuesta anterior estaba en inglés. Por favor, traduce esta respuesta al español manteniendo el mismo significado y tono.' }
      ];
      
      try {
        const translateResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CONFIG.openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin
          },
          body: JSON.stringify({
            model: CONFIG.model,
            messages: translationRequest,
            temperature: 0.5,
            max_tokens: 150
          })
        });
        
        if (translateResponse.ok) {
          const translateData = await translateResponse.json();
          if (translateData.choices && translateData.choices[0] && translateData.choices[0].message) {
            botReply = translateData.choices[0].message.content;
            console.log('Respuesta traducida al español');
          }
        }
      } catch (err) {
        console.error('Error traduciendo respuesta:', err);
      }
    }
    
    messages.push({ role: 'assistant', content: botReply });
    addMessage('bot', botReply);

    await playAvatarResponse(botReply);
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'Lo siento, ocurrió un error al procesar tu mensaje.';
    
    // Mensajes de error más específicos para el usuario
    if (error.message.includes('API Key')) {
      errorMessage = '⚠️ Error de configuración: ' + error.message;
    } else if (error.message.includes('401')) {
      errorMessage = '⚠️ API Key inválida. Por favor, verifica tu configuración.';
    } else if (error.message.includes('429')) {
      errorMessage = '⏱️ Demasiadas solicitudes. Por favor, espera un momento e intenta de nuevo.';
    } else {
      errorMessage = '❌ ' + error.message;
    }
    
    addMessage('bot', errorMessage);
  }
}

function handleVoiceInput() {
  if (!recognition) {
    alert('Tu navegador no soporta reconocimiento de voz.');
    return;
  }
  
  // Si ya está escuchando, detenerlo
  if (isListening) {
    try {
      recognition.stop();
      isListening = false;
      btnMic.classList.remove('listening');
    } catch (e) {
      console.warn('Error deteniendo reconocimiento:', e);
    }
    return;
  }
  
  // Si no está escuchando, iniciarlo
  try {
    isListening = true;
    btnMic.classList.add('listening');
    recognition.start();
  } catch (e) {
    console.error('Error iniciando reconocimiento:', e);
    isListening = false;
    btnMic.classList.remove('listening');
    // Si el error es que ya está iniciado, esperar un momento y reintentar
    if (e.message && e.message.includes('already started')) {
      setTimeout(() => {
        try {
          recognition.stop();
          setTimeout(() => {
            isListening = true;
            btnMic.classList.add('listening');
            recognition.start();
          }, 100);
        } catch (err) {
          console.error('Error reiniciando reconocimiento:', err);
          isListening = false;
          btnMic.classList.remove('listening');
        }
      }, 100);
    }
  }
}

function addMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  
  msgDiv.appendChild(bubble);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Verificar y silenciar videos
function checkVideoAudio() {
  // Asegurar que ambos videos estén siempre silenciados
  avatarVideo1.muted = true;
  avatarVideo2.muted = true;
  avatarVideo1.addEventListener('loadedmetadata', () => {
    avatarVideo1.muted = true;
  });
  avatarVideo2.addEventListener('loadedmetadata', () => {
    avatarVideo2.muted = true;
  });
}

// Seleccionar video según longitud del texto y tema
function selectVideo(text) {
  const textLength = text.length;
  const words = text.split(/\s+/).length;
  
  // Si el texto es largo (más de 100 palabras o 500 caracteres), usar video 2
  // También analizar el tema: si menciona emociones, sentimientos, usar video 2
  const emotionKeywords = ['feliz', 'triste', 'emocion', 'sentimiento', 'alegre', 'preocupado', 'ansioso', 'nervioso', 'contento'];
  const hasEmotionTopic = emotionKeywords.some(keyword => text.toLowerCase().includes(keyword));
  
  if (words > 100 || textLength > 500 || hasEmotionTopic) {
    return avatarVideo2;
  }
  
  return avatarVideo1;
}

async function playAvatarResponse(text) {
  try {
    // Seleccionar video según longitud y tema del texto
    const selectedVideo = selectVideo(text);
    currentVideo = selectedVideo;
    
    // Ocultar ambos videos primero
    avatarVideo1.classList.remove('active');
    avatarVideo2.classList.remove('active');
    
    // Asegurar que ambos videos estén silenciados
    avatarVideo1.muted = true;
    avatarVideo2.muted = true;
    
    const hasVideo = selectedVideo.src && selectedVideo.src.length > 0;
    
    if (hasVideo) {
      // Mostrar video seleccionado mientras habla
      avatarIdle.classList.remove('active');
      selectedVideo.classList.add('active');
      selectedVideo.currentTime = 0;
      selectedVideo.loop = false;
      
      // Listener para rebobinar el video en un loop práctico (segundo 1 -> segundo 3)
      let isRewinding = false;
      const handleTimeUpdate = () => {
        // Solo procesar si el video tiene duración válida y está hablando
        if (!selectedVideo.duration || selectedVideo.duration === 0 || !isSpeaking) return;
        
        const currentTime = selectedVideo.currentTime;
        
        // Rebobinar cuando llegue al segundo 3, volver al segundo 1
        if (currentTime >= 3.0 && !isRewinding) {
          isRewinding = true;
          selectedVideo.currentTime = 1.0;
          
          setTimeout(() => {
            isRewinding = false;
          }, 100);
        }
      };
      
      selectedVideo.addEventListener('timeupdate', handleTimeUpdate);
      
      // Guardar referencia al handler
      selectedVideo._timeUpdateHandler = handleTimeUpdate;
      
      // Reproducir video (silenciado)
      await selectedVideo.play().catch(e => console.error('Error reproduciendo video:', e));
    }
    
    // Usar TTS del texto de la API (siempre)
    if (CONFIG.useWebSpeechTTS && synth) {
      await speakWithWebSpeech(text, hasVideo);
    }
    
  } catch (error) {
    console.error('Error generando respuesta del avatar:', error);
    avatarIdle.classList.add('active');
    avatarVideo1.classList.remove('active');
    avatarVideo2.classList.remove('active');
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.currentTime = 0;
      currentVideo.loop = false;
      if (currentVideo._timeUpdateHandler) {
        currentVideo.removeEventListener('timeupdate', currentVideo._timeUpdateHandler);
        delete currentVideo._timeUpdateHandler;
      }
    }
  }
}

function speakWithWebSpeech(text, hasVideo = false) {
  return new Promise((resolve) => {
    // Verificar que tenemos texto y síntesis disponible
    if (!text || text.trim().length === 0) {
      console.warn('No hay texto para hablar');
      resolve();
      return;
    }
    
    if (!synth) {
      console.error('Síntesis de voz no disponible');
      resolve();
      return;
    }
    
    // Cancelar cualquier síntesis anterior para evitar repeticiones
    synth.cancel();
    
    // Esperar un momento para que se cancele completamente
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Marcar que está hablando ANTES de empezar
        isSpeaking = true;
        
        utterance.onstart = () => {
          console.log('Iniciando síntesis de voz');
        };
      
      utterance.onend = () => {
        // Marcar que ya no está hablando
        isSpeaking = false;
        
        // Esperar a que el video termine su ciclo actual suavemente
        const checkVideoEnd = setInterval(() => {
          if (currentVideo && hasVideo) {
            const currentTime = currentVideo.currentTime;
            // Esperar a que el video esté en un punto seguro del loop (entre 1.0 y 3.0)
            if (currentTime >= 1.0 && currentTime <= 3.0) {
              clearInterval(checkVideoEnd);
              setTimeout(() => {
                // Volver a la imagen fija cuando termine de hablar
                avatarIdle.classList.add('active');
                avatarVideo1.classList.remove('active');
                avatarVideo2.classList.remove('active');
                if (currentVideo) {
                  currentVideo.pause();
                  currentVideo.currentTime = 0;
                  currentVideo.loop = false;
                  if (currentVideo._timeUpdateHandler) {
                    currentVideo.removeEventListener('timeupdate', currentVideo._timeUpdateHandler);
                    delete currentVideo._timeUpdateHandler;
                  }
                }
                currentVideo = null;
                resolve();
              }, 200);
            }
          } else {
            clearInterval(checkVideoEnd);
            resolve();
          }
        }, 50);
      };
      
      utterance.onerror = (event) => {
        console.error('Error en síntesis de voz:', event);
        isSpeaking = false;
        avatarIdle.classList.add('active');
        avatarVideo1.classList.remove('active');
        avatarVideo2.classList.remove('active');
        if (currentVideo && hasVideo) {
          currentVideo.pause();
          currentVideo.currentTime = 0;
          currentVideo.loop = false;
          if (currentVideo._timeUpdateHandler) {
            currentVideo.removeEventListener('timeupdate', currentVideo._timeUpdateHandler);
            delete currentVideo._timeUpdateHandler;
          }
        }
        currentVideo = null;
        resolve();
      };
      
        synth.speak(utterance);
      } catch (error) {
        console.error('Error creando utterance:', error);
        isSpeaking = false;
        resolve();
      }
    }, 100);
  });
}

async function playAudioBlob(audioBlob) {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.onended = () => {
      avatarIdle.classList.add('active');
      avatarVideo.classList.remove('active');
      if (avatarVideo) {
        avatarVideo.pause();
        avatarVideo.currentTime = 0;
      }
      resolve();
    };
    audio.onerror = () => resolve();
    audio.play();
  });
}

async function generateTTS(text) {
  throw new Error('Usar Web Speech API en su lugar');
}

async function generateTalkingVideo(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'speech.wav');
  formData.append('image', 'avatar-idle.jpg');
  
  const response = await fetch(CONFIG.videoGenEndpoint, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.video_url;
}
