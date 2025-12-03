// Configuración
const CONFIG = {
  // API Key de OpenRouter
  openRouterKey: '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',
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
      setTimeout(() => handleSend(), 300);
    };
    recognition.onerror = (event) => {
      console.error('Error de reconocimiento:', event.error);
      btnMic.classList.remove('listening');
    };
    recognition.onend = () => {
      btnMic.classList.remove('listening');
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
      objects: [],
      lastUpdate: new Date()
    };
    
    // Dibujar detecciones en overlay (solo caras)
    drawDetections(faceData, []);
    
    // Actualizar UI
    updateEnvironmentUI(basicAnalysis, faceData, []);
    
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
  // Esto es una aproximación simple - en producción usarías una librería como MediaPipe
  const skinTonePixels = countSkinTonePixels(data);
  faceDetected = skinTonePixels > (pixelCount * 0.1); // Si más del 10% son tonos de piel
  
  return {
    faceDetected,
    movement,
    brightness: Math.round(avgBrightness),
    skinToneRatio: (skinTonePixels / pixelCount * 100).toFixed(1)
  };
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
  
  // Actualizar información básica
  const infoHTML = `
    <div class="info-item">
      <span class="info-label">Estado:</span>
      <span class="info-value">${faces && faces.length > 0 ? `${faces.length} persona(s)` : analysis.faceDetected ? 'Persona detectada' : 'Buscando...'}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Brillo:</span>
      <span class="info-value">${analysis.brightness > 128 ? 'Bueno' : 'Bajo'}</span>
    </div>
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
}

function addEnvironmentContextToSystem() {
  const facesInfo = environmentContext.faces.length > 0 
    ? `${environmentContext.faces.length} persona(s) detectada(s). ${environmentContext.faces[0].expressions?.smiling ? 'La persona está sonriendo (parece feliz).' : ''}`
    : 'Persona detectada.';
  
  const emotionInfo = environmentContext.detectedEmotion 
    ? `Emoción detectada: ${environmentContext.detectedEmotion}.`
    : '';
  
  const contextMessage = `[CONTEXTO DE CÁMARA] La cámara del usuario está activa. ${facesInfo} ${emotionInfo}
  El sistema puede analizar el entorno visual en tiempo real con detección facial básica.
  Si detectas emociones (feliz, triste, preocupado, etc.), pregunta al usuario de forma empática cómo se siente.`;
  
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
  btnMic.classList.add('listening');
  recognition.start();
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
    // Cancelar cualquier síntesis anterior para evitar repeticiones
    synth.cancel();
    
    // Esperar un momento para que se cancele completamente
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Marcar que está hablando ANTES de empezar
      isSpeaking = true;
      
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
