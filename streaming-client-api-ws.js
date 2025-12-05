'use strict';

const fetchJsonFile = await fetch('./api.json');
const DID_API = await fetchJsonFile.json();

if (DID_API.key == '🤫') alert('Please put your api key inside ./api.json and restart..');

const RTCPeerConnection = (
  window.RTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.mozRTCPeerConnection
).bind(window);

let peerConnection;
let pcDataChannel;
let streamId;
let sessionId;
let sessionClientAnswer;

let statsIntervalId;
let lastBytesReceived;
let videoIsPlaying = false;
let streamVideoOpacity = 0;

// Set this variable to true to request stream warmup upon connection to mitigate potential jittering issues
const stream_warmup = true;
let isStreamReady = !stream_warmup;

const idleVideoElement = document.getElementById('idle-video-element');
const streamVideoElement = document.getElementById('stream-video-element');
if (idleVideoElement) idleVideoElement.setAttribute('playsinline', '');
if (streamVideoElement) streamVideoElement.setAttribute('playsinline', '');
// Referencias a elementos de UI (mantener compatibilidad)
const peerStatusLabel = document.getElementById('peer-status-label');
const iceStatusLabel = document.getElementById('ice-status-label');
const iceGatheringStatusLabel = document.getElementById('ice-gathering-status-label');
const signalingStatusLabel = document.getElementById('signaling-status-label');
const streamingStatusLabel = document.getElementById('streaming-status-label');
const streamEventLabel = document.getElementById('stream-event-label');

// Nueva UI
const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');
let statusDot = null;
if (connectionStatus) {
  statusDot = connectionStatus.querySelector('.status-dot');
}
const loadingOverlay = document.getElementById('loading-overlay');
const conversationStatusEl = document.getElementById('conversation-status');

// Estados de UI - Todo desactivado por defecto, el usuario decide qué activar
let micEnabled = false;
let cameraEnabled = false;
let screenShareEnabled = false;

const presenterInputByService = {
  talks: {
    source_url: 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg',
  },
  clips: {
    presenter_id: 'v2_public_alex@qcvo4gupoy',
    driver_id: 'e3nbserss8',
  },
};

const PRESENTER_TYPE = DID_API.service === 'clips' ? 'clip' : 'talk';

let ws;

// Función de conexión (reutilizable)
async function connectToAvatar() {
  if (peerConnection && peerConnection.connectionState === 'connected') {
    return;
  }

  updateConnectionStatus('connecting', 'Conectando...');
  stopAllStreams();
  closePC();

  try {
    // Step 1: Connect to WebSocket
    ws = await connectToWebSocket(DID_API.websocketUrl, DID_API.key);

    // Step 2: Send "init-stream" message to WebSocket
    const startStreamMessage = {
      type: 'init-stream',
      payload: {
        ...presenterInputByService[DID_API.service],
        presenter_type: PRESENTER_TYPE,
      },
    };
    sendMessage(ws, startStreamMessage);

    // Step 3: Handle WebSocket responses by message type
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      switch (data.messageType) {
        case 'init-stream':
          const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = data;
          streamId = newStreamId;
          sessionId = newSessionId;
          console.log('[STREAM] init-stream recibido:', { streamId: newStreamId, sessionId: newSessionId });
          console.log('[STREAM] Creando PeerConnection...');
          try {
            sessionClientAnswer = await createPeerConnection(offer, iceServers);
            console.log('[STREAM] PeerConnection creado exitosamente');
            // Step 4: Send SDP answer to WebSocket
            const sdpMessage = {
              type: 'sdp',
              payload: {
                answer: sessionClientAnswer,
                session_id: sessionId,
                presenter_type: PRESENTER_TYPE,
              },
            };
            sendMessage(ws, sdpMessage);
            console.log('[STREAM] SDP answer enviado');
          } catch (e) {
            console.error('[ERROR] Error durante configuración de stream:', e);
            console.error('[ERROR] Stack:', e.stack);
            updateConnectionStatus('error', 'Error de conexión: ' + e.message);
            if (loadingOverlay) {
              loadingOverlay.classList.add('hidden');
            }
            stopAllStreams();
            closePC();
            return;
          }
          break;

        case 'sdp':
          console.log('SDP message received:', event.data);
          break;

        case 'delete-stream':
          console.log('Stream deleted:', event.data);
          break;
      }
    };
  } catch (error) {
    console.error('[ERROR] Fallo al conectar y configurar stream:', error);
    console.error('[ERROR] Tipo:', error.type);
    console.error('[ERROR] Mensaje:', error.message);
    console.error('[ERROR] Stack:', error.stack);
    updateConnectionStatus('error', 'Error de conexión: ' + (error.message || error.type || 'Desconocido'));
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }
}

// Auto-inicio deshabilitado - usar controles manuales

// Botones de prueba (opcionales - solo si existen en el DOM)
const streamWordButton = document.getElementById('stream-word-button');
if (streamWordButton) {
  streamWordButton.onclick = async () => {
  const text = 'This is a demo of the D-ID WebSocket Streaming API with text chunks.';
  const text2 = 'Real-time video streaming is easy with D-ID';

  let chunks = text.split(' ');
  chunks.push('<break time="3s" />'); // Note : ssml part tags should be grouped together to be sent on the same chunk
  chunks.push(...text2.split(' '));

  // Indicates end of text stream
  chunks.push('');

  for (const [index, chunk] of chunks.entries()) {
    const streamMessage = {
      type: 'stream-text',
      payload: {
        script: {
          type: 'text',
          input: chunk + ' ',
          provider: {
            type: 'microsoft',
            voice_id: 'en-US-JennyNeural',
          },
          ssml: true,
        },
        config: {
          stitch: true,
        },
        apiKeysExternal: {
          elevenlabs: { key: '' },
        },
        background: {
          color: '#000000',
        },
        index, // Note : add index to track the order of the chunks (better performance), optional field
        session_id: sessionId,
        stream_id: streamId,
        presenter_type: PRESENTER_TYPE,
      },
    };

    sendMessage(ws, streamMessage);
  }
  };
}

const streamAudioButton = document.getElementById('stream-audio-button');
if (streamAudioButton) {
  streamAudioButton.onclick = async () => {
  // Note : we use elevenlabs to stream pcm chunks, you can use any other provider
  const elevenKey = DID_API.elevenlabsKey;
  if (!elevenKey) {
    const errorMessage = 'Please put your elevenlabs key inside ./api.json and restart..';
    alert(errorMessage);
    console.error(errorMessage);
    return;
  }
  async function stream(text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=pcm_16000`,
      {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_turbo_v2_5' }),
        // Please see the list of available models here - https://docs.d-id.com/reference/tts-elevenlabs#%EF%B8%8F-voice-config
      }
    );

    return response.body;
  }

  const streamText =
    'This is a demo of the D-ID WebSocket Streaming API with audio PCM chunks. <break time="1s" /> Real-time video streaming is easy with D-ID';

  const activeStream = await stream(streamText);
  let i = 0;
  // Note: PCM chunks
  for await (const chunk of activeStream) {
    // Imporatnt Note : 30KB is the max chunk size + keep max concurrent requests up to 300, adjust chunk size as needed
    const splitted = splitArrayIntoChunks([...chunk], 10000); // chunk size: 10KB
    for (const [_, chunk] of splitted.entries()) {
      sendStreamMessage([...chunk], i++);
    }
  }
  sendStreamMessage(Array.from(new Uint8Array(0)), i);
  console.log('done', i);
  };
}

// Botón destroy (opcional)
const destroyButton = document.getElementById('destroy-button');
if (destroyButton) {
  destroyButton.onclick = async () => {
    const streamMessage = {
      type: 'delete-stream',
      payload: {
        session_id: sessionId,
        stream_id: streamId,
      },
    };
    sendMessage(ws, streamMessage);

    // Close WebSocket connection
    if (ws) {
      ws.close();
      ws = null;
    }

    stopAllStreams();
    closePC();
  };
}

function onIceGatheringStateChange() {
  if (iceGatheringStatusLabel) {
    iceGatheringStatusLabel.innerText = peerConnection.iceGatheringState;
    iceGatheringStatusLabel.className = 'iceGatheringState-' + peerConnection.iceGatheringState;
  }
  updateStatusDisplay();
}

function onIceCandidate(event) {
  console.log('onIceCandidate', event);
  if (event.candidate) {
    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
    sendMessage(ws, {
      type: 'ice',
      payload: {
        session_id: sessionId,
        candidate,
        sdpMid,
        sdpMLineIndex,
        presenter_type: PRESENTER_TYPE,
      },
    });
  } else {
    sendMessage(ws, {
      type: 'ice',
      payload: {
        stream_id: streamId,
        session_id: sessionId,
        presenter_type: PRESENTER_TYPE,
      },
    });
  }
}
function onIceConnectionStateChange() {
  if (iceStatusLabel) {
    iceStatusLabel.innerText = peerConnection.iceConnectionState;
    iceStatusLabel.className = 'iceConnectionState-' + peerConnection.iceConnectionState;
  }
  if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
    stopAllStreams();
    closePC();
    updateConnectionStatus('error', 'Conexión fallida');
  }
  updateStatusDisplay();
}
function onConnectionStateChange() {
  // not supported in firefox
  if (peerStatusLabel) {
    peerStatusLabel.innerText = peerConnection.connectionState;
    peerStatusLabel.className = 'peerConnectionState-' + peerConnection.connectionState;
  }
  console.log('[PEER] Estado de conexión:', peerConnection.connectionState);

  // Actualizar UI de conexión
  const state = peerConnection.connectionState;
  console.log('[PEER] Estado cambiado a:', state);
  
  if (state === 'connected') {
    console.log('[PEER] ✅ Conexión establecida exitosamente');
    updateConnectionStatus('connected', 'Conectado');
    playIdleVideo();
    /**
     * A fallback mechanism: if the 'stream/ready' event isn't received within 5 seconds after asking for stream warmup,
     * it updates the UI to indicate that the system is ready to start streaming data.
     */
    setTimeout(() => {
      if (!isStreamReady) {
        console.log('forcing stream/ready');
        isStreamReady = true;
        if (streamEventLabel) {
          streamEventLabel.innerText = 'ready';
          streamEventLabel.className = 'streamEvent-ready';
        }
        // Auto-iniciar conversación cuando el stream esté listo
        if (!isConversationActive) {
          console.log('[AUTO] Stream listo, iniciando conversación automáticamente...');
          setTimeout(() => {
            startConversation();
          }, 1000);
        }
      }
    }, 5000);
  } else if (state === 'connecting') {
    updateConnectionStatus('connecting', 'Conectando...');
  } else if (state === 'failed' || state === 'closed') {
    updateConnectionStatus('error', 'Desconectado');
  }
  updateStatusDisplay();
}
function onSignalingStateChange() {
  if (signalingStatusLabel) {
    signalingStatusLabel.innerText = peerConnection.signalingState;
    signalingStatusLabel.className = 'signalingState-' + peerConnection.signalingState;
  }
  updateStatusDisplay();
}

function onVideoStatusChange(videoIsPlaying, stream) {
  let status;

  if (videoIsPlaying) {
    status = 'streaming';
    streamVideoOpacity = isStreamReady ? 1 : 0;
    setStreamVideoElement(stream);
  } else {
    status = 'empty';
    streamVideoOpacity = 0;
  }

  streamVideoElement.style.opacity = streamVideoOpacity;
  idleVideoElement.style.opacity = 1 - streamVideoOpacity;

  if (streamingStatusLabel) {
    streamingStatusLabel.innerText = status;
    streamingStatusLabel.className = 'streamingState-' + status;
  }
  updateStatusDisplay();
}

function onTrack(event) {
  /**
   * The following code is designed to provide information about wether currently there is data
   * that's being streamed - It does so by periodically looking for changes in total stream data size
   *
   * This information in our case is used in order to show idle video while no video is streaming.
   * To create this idle video use the POST https://api.d-id.com/talks (or clips) endpoint with a silent audio file or a text script with only ssml breaks
   * https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html#break-tag
   * for seamless results use `config.fluent: true` and provide the same configuration as the streaming video
   */

  if (!event.track) return;

  statsIntervalId = setInterval(async () => {
    const stats = await peerConnection.getStats(event.track);
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;

        if (videoStatusChanged) {
          videoIsPlaying = report.bytesReceived > lastBytesReceived;
          onVideoStatusChange(videoIsPlaying, event.streams[0]);
        }
        lastBytesReceived = report.bytesReceived;
      }
    });
  }, 500);
}

function onStreamEvent(message) {
  /**
   * This function handles stream events received on the data channel.
   * The 'stream/ready' event received on the data channel signals the end of the 2sec idle streaming.
   * Upon receiving the 'ready' event, we can display the streamed video if one is available on the stream channel.
   * Until the 'ready' event is received, we hide any streamed video.
   * Additionally, this function processes events for stream start, completion, and errors. Other data events are disregarded.
   */

  if (pcDataChannel.readyState === 'open') {
    let status;
    const [event, _] = message.data.split(':');

    console.log('[STREAM EVENT] Evento recibido:', event);
    
    switch (event) {
      case 'stream/started':
        status = 'started';
        console.log('[STREAM EVENT] ✅ Stream iniciado');
        break;
      case 'stream/done':
        status = 'done';
        console.log('[STREAM EVENT] ✅ Stream completado');
        break;
      case 'stream/ready':
        status = 'ready';
        console.log('[STREAM EVENT] ✅ Stream listo para recibir datos');
        break;
      case 'stream/error':
        status = 'error';
        console.log('[STREAM EVENT] ❌ Error en stream');
        break;
      default:
        status = 'dont-care';
        break;
    }

    // Set stream ready after a short delay, adjusting for potential timing differences between data and stream channels
    if (status === 'ready') {
      setTimeout(() => {
        console.log('[STREAM EVENT] stream/ready confirmado - ocultando loading overlay');
        isStreamReady = true;
        if (streamEventLabel) {
          streamEventLabel.innerText = 'ready';
          streamEventLabel.className = 'streamEvent-ready';
        }
        // Ocultar loading overlay cuando el stream esté listo
        if (loadingOverlay) {
          console.log('[STREAM EVENT] Ocultando loading overlay');
          loadingOverlay.classList.add('hidden');
        }
        updateStatusDisplay();
        // Auto-inicio deshabilitado
      }, 1000);
    } else {
      console.log(event);
      if (streamEventLabel) {
        streamEventLabel.innerText = status === 'dont-care' ? event : status;
        streamEventLabel.className = 'streamEvent-' + status;
      }
      updateStatusDisplay();
    }
  }
}

async function createPeerConnection(offer, iceServers) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers });
    pcDataChannel = peerConnection.createDataChannel('JanusDataChannel');
    peerConnection.addEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
    peerConnection.addEventListener('icecandidate', onIceCandidate, true);
    peerConnection.addEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
    peerConnection.addEventListener('connectionstatechange', onConnectionStateChange, true);
    peerConnection.addEventListener('signalingstatechange', onSignalingStateChange, true);
    peerConnection.addEventListener('track', onTrack, true);
    pcDataChannel.addEventListener('message', onStreamEvent, true);
  }

  await peerConnection.setRemoteDescription(offer);
  console.log('set remote sdp OK');

  const sessionClientAnswer = await peerConnection.createAnswer();
  console.log('create local sdp OK');

  await peerConnection.setLocalDescription(sessionClientAnswer);
  console.log('set local sdp OK');

  return sessionClientAnswer;
}

function setStreamVideoElement(stream) {
  if (!stream) return;

  streamVideoElement.srcObject = stream;
  streamVideoElement.loop = false;
  streamVideoElement.mute = !isStreamReady;

  // safari hotfix
  if (streamVideoElement.paused) {
    streamVideoElement
      .play()
      .then((_) => {})
      .catch((e) => {});
  }
}

function playIdleVideo() {
  idleVideoElement.src = DID_API.service == 'clips' ? 'alex_v2_idle.mp4' : 'emma_idle.mp4';
}

function stopAllStreams() {
  if (streamVideoElement.srcObject) {
    console.log('stopping video streams');
    streamVideoElement.srcObject.getTracks().forEach((track) => track.stop());
    streamVideoElement.srcObject = null;
    streamVideoOpacity = 0;
  }
}

function closePC(pc = peerConnection) {
  if (!pc) return;
  console.log('stopping peer connection');
  pc.close();
  pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
  pc.removeEventListener('icecandidate', onIceCandidate, true);
  pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
  pc.removeEventListener('connectionstatechange', onConnectionStateChange, true);
  pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
  pc.removeEventListener('track', onTrack, true);
  pcDataChannel.removeEventListener('message', onStreamEvent, true);

  clearInterval(statsIntervalId);
  isStreamReady = !stream_warmup;
  streamVideoOpacity = 0;
  iceGatheringStatusLabel.innerText = '';
  signalingStatusLabel.innerText = '';
  iceStatusLabel.innerText = '';
  peerStatusLabel.innerText = '';
  streamEventLabel.innerText = '';
  console.log('stopped peer connection');
  if (pc === peerConnection) {
    peerConnection = null;
  }
}

const maxRetryCount = 3;
const maxDelaySec = 4;

async function connectToWebSocket(url, token) {
  return new Promise((resolve, reject) => {
    const wsUrl = `${url}?authorization=Basic ${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection opened.');
      resolve(ws);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      reject(err);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
    };
  });
}

function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket is not open. Cannot send message.');
  }
}

function sendStreamMessage(input, index) {
  const streamMessage = {
    type: 'stream-audio',
    payload: {
      script: {
        type: 'audio',
        input,
      },
      config: {
        stitch: true,
      },
      background: {
        color: '#FFFFFF',
      },
      index, // Note : add index to track the order of the chunks (better performance), optional field
      session_id: sessionId,
      stream_id: streamId,
      presenter_type: PRESENTER_TYPE,
    },
  };

  sendMessage(ws, streamMessage);
}

function splitArrayIntoChunks(array, size) {
  if (!Array.isArray(array)) {
    throw new TypeError('Input should be an array');
  }
  if (typeof size !== 'number' || size <= 0) {
    throw new TypeError('Size should be a positive number');
  }

  const result = [];
  for (let i = 0; i < array.length; i += size) {
    const chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
}

// ========== CONVERSACIÓN EN TIEMPO REAL ==========
let recognition = null;
let isConversationActive = false;
let conversationHistory = [];

// Configuración de OpenRouter
const OPENROUTER_API_KEY = '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';
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-70b-instruct';
const OPENROUTER_VISION_MODEL = 'openai/gpt-4o-mini'; // Modelo con capacidad de visión
const OPENROUTER_APP_URL = 'http://localhost:5173';
const OPENROUTER_APP_NAME = 'Avatar Realtime Agent';

// Variables de cámara
let userCameraStream = null;
let userCameraVideo = null;
let cameraAnalysisInterval = null;
let lastAnalysisTime = 0;
const ANALYSIS_INTERVAL = 5000; // Analizar cada 5 segundos

// Inicializar reconocimiento de voz
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome o Edge.');
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true; // Cambiar a true para mejor detección
  recognition.lang = 'es-ES'; // Cambiar a 'en-US' para inglés
  recognition.maxAlternatives = 1;

  console.log('[AUDIO] Reconocimiento de voz inicializado');
  console.log('[AUDIO] Idioma:', recognition.lang);
  console.log('[AUDIO] Continuo:', recognition.continuous);

  recognition.onresult = async (event) => {
    console.log('[AUDIO] Resultado recibido, resultados:', event.results.length);
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript.trim();
    
    if (transcript && lastResult.isFinal) {
      console.log('Usuario dijo:', transcript);
      updateUserMessage(transcript);
      
      // Obtener respuesta del LLM
      await getLLMResponse(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error('[AUDIO] Error en reconocimiento de voz:', event.error);
    console.error('[AUDIO] Detalles del error:', event);
    
    if (event.error === 'no-speech') {
      console.log('[AUDIO] No se detectó habla, reintentando...');
      // Reiniciar si no hay habla detectada
      setTimeout(() => {
        if (isConversationActive && recognition) {
          recognition.start();
        }
      }, 1000);
    } else if (event.error === 'not-allowed') {
      console.error('[AUDIO] Permisos de micrófono denegados');
      alert('Por favor, permite el acceso al micrófono en la configuración del navegador.');
    } else if (event.error === 'audio-capture') {
      console.error('[AUDIO] No se pudo capturar audio');
      alert('No se pudo acceder al micrófono. Verifica que esté conectado y funcionando.');
    }
  };

  recognition.onend = () => {
    console.log('[AUDIO] Reconocimiento de voz finalizado');
    // Reiniciar automáticamente si la conversación está activa
    if (isConversationActive && recognition) {
      console.log('[AUDIO] Reiniciando reconocimiento...');
      setTimeout(() => {
        recognition.start();
      }, 100);
    }
  };
  
  recognition.onstart = () => {
    console.log('[AUDIO] ✅ Reconocimiento de voz iniciado - Escuchando...');
    updateListeningStatus('🎤 Escuchando...');
  };

  return recognition;
}

// Capturar frame de la cámara y convertir a base64
function captureCameraFrame() {
  if (!userCameraVideo || !userCameraStream) {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = userCameraVideo.videoWidth || 640;
    canvas.height = userCameraVideo.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(userCameraVideo, 0, 0, canvas.width, canvas.height);
    
    // Reducir calidad para optimizar
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (error) {
    console.error('Error capturando frame:', error);
    return null;
  }
}

// Analizar el entorno visual usando visión del LLM
async function analyzeVisualEnvironment() {
  if (!userCameraStream || !userCameraVideo) {
    return null;
  }

  const frameBase64 = captureCameraFrame();
  if (!frameBase64) {
    return null;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_APP_URL,
        'X-Title': OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        model: OPENROUTER_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza esta imagen del entorno del usuario. Describe lo que ves de manera concisa: objetos, personas, ambiente, colores, iluminación, etc. Responde en español.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: frameBase64
                }
              }
            ]
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error en análisis visual:', error);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Error analizando entorno visual:', error);
    return null;
  }
}

// Obtener respuesta del LLM usando OpenRouter
async function getLLMResponse(userMessage) {
  try {
    updateListeningStatus('🤔 Pensando...');
    
    // Obtener análisis visual si la cámara está activa
    let visualContext = '';
    if (userCameraStream && userCameraVideo) {
      const visualAnalysis = await analyzeVisualEnvironment();
      if (visualAnalysis) {
        visualContext = `\n\n[Contexto visual del entorno: ${visualAnalysis}]`;
        updateVisualAnalysis(visualAnalysis);
      }
    }
    
    // Agregar mensaje del usuario al historial con contexto visual
    const userMessageWithContext = userMessage + visualContext;
    conversationHistory.push({ role: 'user', content: userMessageWithContext });
    
    // Mantener solo los últimos 10 mensajes para no exceder límites
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_APP_URL,
        'X-Title': OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente virtual amigable y conversacional. Puedes ver el entorno del usuario a través de su cámara. Responde de manera natural y concisa, incorporando información visual cuando sea relevante.'
          },
          ...conversationHistory
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
    
    console.log('Respuesta del LLM:', aiResponse);
    updateAIResponse(aiResponse);
    
    // Agregar respuesta del asistente al historial
    conversationHistory.push({ role: 'assistant', content: aiResponse });
    
    // Enviar respuesta al avatar
    await sendTextToAvatar(aiResponse);
    
    updateListeningStatus('🎤 Escuchando...');
  } catch (error) {
    console.error('Error al obtener respuesta del LLM:', error);
    updateListeningStatus('❌ Error: ' + error.message);
    setTimeout(() => {
      if (isConversationActive) {
        updateListeningStatus('🎤 Escuchando...');
      }
    }, 3000);
  }
}

// Enviar texto al avatar usando streaming
async function sendTextToAvatar(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !streamId || !sessionId) {
    console.error('No hay conexión activa con el avatar');
    return;
  }

  // Dividir el texto en palabras para streaming suave
  const words = text.split(' ');
  const chunks = words.filter(word => word.trim().length > 0);
  
  // Agregar un break al final
  chunks.push('<break time="1s" />');
  chunks.push(''); // Indica fin del stream

  for (const [index, chunk] of chunks.entries()) {
    const streamMessage = {
      type: 'stream-text',
      payload: {
        script: {
          type: 'text',
          input: chunk + (chunk ? ' ' : ''),
          provider: {
            type: 'microsoft',
            voice_id: 'es-ES-ElviraNeural', // Voz en español, cambiar a 'en-US-JennyNeural' para inglés
          },
          ssml: true,
        },
        config: {
          stitch: true,
        },
        apiKeysExternal: {
          elevenlabs: { key: '' },
        },
        background: {
          color: '#000000',
        },
        index,
        session_id: sessionId,
        stream_id: streamId,
        presenter_type: PRESENTER_TYPE,
      },
    };

    sendMessage(ws, streamMessage);
    
    // Pequeña pausa entre chunks para mejor fluidez
    if (chunk && index < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

// Actualizar UI
function updateUserMessage(message) {
  if (!message) return;
  
  // Mostrar el contenedor de conversación solo cuando hay mensaje (temporalmente)
  if (conversationStatusEl) {
    conversationStatusEl.style.display = 'block';
    conversationStatusEl.classList.add('active');
  }
  
  const userMsgEl = document.getElementById('user-message');
  if (userMsgEl) {
    userMsgEl.textContent = `👤 Tú: ${message}`;
  }
  
  // Ocultar después de 3 segundos
  setTimeout(() => {
    if (conversationStatusEl) {
      conversationStatusEl.style.display = 'none';
      conversationStatusEl.classList.remove('active');
    }
  }, 3000);
}

function updateAIResponse(response) {
  if (!response) return;
  
  // Mostrar el contenedor de conversación cuando hay respuesta (temporalmente)
  if (conversationStatusEl) {
    conversationStatusEl.style.display = 'block';
    conversationStatusEl.classList.add('active');
  }
  
  const aiResponseEl = document.getElementById('ai-response');
  if (aiResponseEl) {
    aiResponseEl.textContent = `🤖 Avatar: ${response}`;
  }
  
  // Ocultar después de 5 segundos
  setTimeout(() => {
    if (conversationStatusEl) {
      conversationStatusEl.style.display = 'none';
      conversationStatusEl.classList.remove('active');
    }
  }, 5000);
}

function updateListeningStatus(status) {
  // No mostrar el estado de escucha en la UI - mantenerlo oculto
  // Solo loguear en consola para debugging
  console.log('[UI]', status);
  
  // El estado de conversación permanece oculto por defecto
  // Solo se muestra cuando hay mensajes reales (updateUserMessage/updateAIResponse)
}

function updateVisualAnalysis(analysis) {
  const analysisEl = document.getElementById('visual-analysis');
  const contentEl = document.getElementById('visual-analysis-content');
  if (analysisEl && contentEl) {
    analysisEl.style.display = 'block';
    contentEl.textContent = analysis;
  }
}

// ========== FUNCIONES DE CÁMARA ==========

// Iniciar cámara del usuario
async function startUserCamera() {
  try {
    userCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user' // Cámara frontal
      },
      audio: false
    });

    userCameraVideo = document.getElementById('user-camera-video');
    const cameraWrapper = document.getElementById('user-camera-wrapper');

    if (userCameraVideo && cameraWrapper) {
      userCameraVideo.srcObject = userCameraStream;
      cameraWrapper.classList.add('active');
      cameraWrapper.classList.add('camera-active');

      // Iniciar análisis periódico del entorno
      startPeriodicVisualAnalysis();
      
      // Actualizar estado del botón
      cameraEnabled = true;
      if (typeof updateCameraButtonState === 'function') {
        updateCameraButtonState();
      }
      
      console.log('[CÁMARA] Cámara iniciada correctamente');
    }
  } catch (error) {
    console.error('[CÁMARA] Error al acceder a la cámara:', error);
    cameraEnabled = false;
    if (typeof updateCameraButtonState === 'function') {
      updateCameraButtonState();
    }
    alert('Error al acceder a la cámara. Asegúrate de permitir el acceso a la cámara.');
  }
}

// Detener cámara del usuario
function stopUserCamera() {
  if (userCameraStream) {
    userCameraStream.getTracks().forEach(track => track.stop());
    userCameraStream = null;
  }

  if (userCameraVideo) {
    userCameraVideo.srcObject = null;
  }

  const cameraWrapper = document.getElementById('user-camera-wrapper');

  if (cameraWrapper) {
    cameraWrapper.classList.remove('active');
    cameraWrapper.classList.remove('camera-active');
  }

  // Detener análisis periódico
  stopPeriodicVisualAnalysis();
  
  // Actualizar estado del botón
  cameraEnabled = false;
  if (typeof updateCameraButtonState === 'function') {
    updateCameraButtonState();
  }
  
  // Ocultar análisis visual
  const analysisEl = document.getElementById('visual-analysis');
  if (analysisEl) {
    analysisEl.style.display = 'none';
  }
  
  console.log('Cámara detenida');
}

// Análisis periódico del entorno visual
function startPeriodicVisualAnalysis() {
  stopPeriodicVisualAnalysis(); // Asegurarse de que no haya otro intervalo activo
  
  cameraAnalysisInterval = setInterval(async () => {
    if (userCameraStream && isConversationActive) {
      const analysis = await analyzeVisualEnvironment();
      if (analysis) {
        updateVisualAnalysis(analysis);
        // Guardar análisis en el contexto para futuras respuestas
        console.log('Análisis visual actualizado:', analysis);
      }
    }
  }, ANALYSIS_INTERVAL);
}

function stopPeriodicVisualAnalysis() {
  if (cameraAnalysisInterval) {
    clearInterval(cameraAnalysisInterval);
    cameraAnalysisInterval = null;
  }
}

// Botones de cámara (mantener compatibilidad si existen)
const startCameraButton = document.getElementById('start-camera-button');
const stopCameraButton = document.getElementById('stop-camera-button');

if (startCameraButton) {
  startCameraButton.onclick = startUserCamera;
}

if (stopCameraButton) {
  stopCameraButton.onclick = stopUserCamera;
}

// Botones de conversación (mantener compatibilidad si existen)
const startConversationButton = document.getElementById('start-conversation-button');
const stopConversationButton = document.getElementById('stop-conversation-button');

if (startConversationButton) {
  startConversationButton.onclick = () => startConversation();
}

if (stopConversationButton) {
  stopConversationButton.onclick = () => stopConversation();
}

// Función reutilizable para iniciar conversación
function startConversation() {
  // Verificar que esté conectado
  if (!ws || ws.readyState !== WebSocket.OPEN || !streamId || !sessionId) {
    console.warn('No hay conexión activa con el avatar');
    return;
  }

  if (!isStreamReady) {
    console.warn('Stream no está listo aún');
    return;
  }

  // Inicializar reconocimiento de voz
  if (!recognition) {
    recognition = initSpeechRecognition();
    if (!recognition) {
      return;
    }
  }

  isConversationActive = true;
  conversationHistory = []; // Reiniciar historial
  
  // Mantener UI de conversación oculta por defecto
  if (conversationStatusEl) {
    conversationStatusEl.style.display = 'none';
    conversationStatusEl.classList.remove('active');
  }
  updateListeningStatus('🎤 Escuchando...');
  
  // Solicitar permisos de micrófono explícitamente antes de iniciar
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      console.log('[AUDIO] ✅ Permisos de micrófono otorgados');
      // Detener el stream inmediatamente, solo necesitábamos los permisos
      stream.getTracks().forEach(track => track.stop());
      
      // Iniciar reconocimiento
      try {
        recognition.start();
        console.log('[CONVERSACIÓN] ✅ Conversación iniciada');
      } catch (error) {
        console.error('[CONVERSACIÓN] Error al iniciar reconocimiento:', error);
        alert('Error al iniciar el reconocimiento de voz. Verifica los permisos del micrófono.');
      }
    })
    .catch((error) => {
      console.error('[AUDIO] Error al solicitar permisos de micrófono:', error);
      alert('Error al acceder al micrófono. Por favor, permite el acceso al micrófono.');
      isConversationActive = false;
    });
}

// Función reutilizable para detener conversación
function stopConversation() {
  isConversationActive = false;
  
  if (recognition) {
    recognition.stop();
  }
  
  // Detener análisis periódico
  stopPeriodicVisualAnalysis();
  
  // Ocultar UI de conversación
  if (conversationStatusEl) {
    conversationStatusEl.style.display = 'none';
    conversationStatusEl.classList.remove('active');
  }
  
  console.log('Conversación detenida');
}

// ========== NUEVOS CONTROLES DE VIDEOLLAMADA ==========

// Función para actualizar estado de conexión en UI
function updateConnectionStatus(state, text) {
  if (statusText) {
    statusText.textContent = text;
  }
  
  // Actualizar status dot
  if (connectionStatus) {
    let dot = connectionStatus.querySelector('.status-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'status-dot';
      connectionStatus.appendChild(dot);
    }
    dot.className = 'status-dot absolute top-2 right-2 w-2 h-2 rounded-full';
    if (state === 'connecting') {
      dot.classList.add('bg-yellow-500');
      dot.classList.remove('bg-green-500', 'bg-red-500');
    } else if (state === 'connected') {
      dot.classList.add('bg-green-500');
      dot.classList.remove('bg-yellow-500', 'bg-red-500');
    } else if (state === 'error') {
      dot.classList.add('bg-red-500');
      dot.classList.remove('bg-yellow-500', 'bg-green-500');
    }
  }
  
  updateStatusDisplay();
  
  // Ocultar loading cuando esté conectado
  if (state === 'connected' && loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
  
}

// Función para actualizar estados en bottom sheet
function updateStatusDisplay() {
  const statusIce = document.getElementById('status-ice');
  const statusPeer = document.getElementById('status-peer');
  const statusStream = document.getElementById('status-stream');
  const statusEvent = document.getElementById('status-event');
  
  if (statusIce && peerConnection) {
    statusIce.textContent = peerConnection.iceConnectionState || 'N/A';
  }
  if (statusPeer && peerConnection) {
    statusPeer.textContent = peerConnection.connectionState || 'N/A';
  }
  if (statusStream) {
    statusStream.textContent = isStreamReady ? 'Listo' : 'No listo';
  }
  if (statusEvent && streamEventLabel) {
    statusEvent.textContent = streamEventLabel.innerText || 'N/A';
  }
}

// Función connectToAvatar ya está definida arriba (línea 70) - NO DUPLICAR

// Botones de videollamada (nuevos IDs)
const micButton = document.getElementById('mic-button');
const cameraButton = document.getElementById('camera-button');
const settingsButton = document.getElementById('settings-button');
const hangupButton = document.getElementById('hangup-button');
const flipCameraButton = document.getElementById('flip-camera-button');
const screenShareButton = document.getElementById('screen-share-button');

// Función para actualizar estado visual del botón de micrófono
function updateMicButtonState() {
  if (!micButton) return;
  
  const icon = micButton.querySelector('.material-symbols-outlined');
  if (micEnabled) {
    micButton.classList.add('active');
    micButton.classList.remove('muted');
    micButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    if (icon) icon.textContent = 'mic';
  } else {
    micButton.classList.remove('active');
    micButton.classList.add('muted');
    micButton.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
    if (icon) icon.textContent = 'mic_off';
  }
}

// Control de micrófono
if (micButton) {
  micButton.onclick = () => {
    micEnabled = !micEnabled;
    console.log('[UI] Micrófono:', micEnabled ? 'ACTIVADO' : 'DESACTIVADO');
    
    updateMicButtonState();
    
    if (micEnabled) {
      if (isConversationActive && recognition) {
        recognition.start();
        console.log('[UI] Reconocimiento de voz iniciado');
      }
    } else {
      if (recognition) {
        recognition.stop();
        console.log('[UI] Reconocimiento de voz detenido');
      }
    }
  };
  
  // Inicializar estado visual
  updateMicButtonState();
}

// Función para actualizar estado visual del botón de cámara
function updateCameraButtonState() {
  if (!cameraButton) return;
  
  const icon = cameraButton.querySelector('.material-symbols-outlined');
  if (cameraEnabled) {
    cameraButton.classList.add('active');
    cameraButton.classList.remove('off');
    cameraButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    if (icon) icon.textContent = 'videocam';
  } else {
    cameraButton.classList.remove('active');
    cameraButton.classList.add('off');
    cameraButton.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
    if (icon) icon.textContent = 'videocam_off';
  }
}

// Control de cámara
if (cameraButton) {
  cameraButton.onclick = async () => {
    cameraEnabled = !cameraEnabled;
    console.log('[UI] Cámara:', cameraEnabled ? 'ACTIVADA' : 'DESACTIVADA');
    
    updateCameraButtonState();
    
    if (cameraEnabled) {
      try {
        await startUserCamera();
        console.log('[UI] Cámara iniciada correctamente');
      } catch (error) {
        console.error('[UI] Error al iniciar cámara:', error);
        cameraEnabled = false;
        updateCameraButtonState();
      }
    } else {
      stopUserCamera();
      console.log('[UI] Cámara detenida');
    }
  };
  
  // Inicializar estado visual (desactivado por defecto)
  updateCameraButtonState();
}

// Botón de voltear cámara
if (flipCameraButton) {
  flipCameraButton.onclick = async () => {
    if (!cameraEnabled) {
      console.log('[UI] Primero activa la cámara para voltearla');
      // Activar cámara si está desactivada
      cameraEnabled = true;
      updateCameraButtonState();
      try {
        await startUserCamera();
      } catch (error) {
        console.error('[UI] Error al iniciar cámara:', error);
        cameraEnabled = false;
        updateCameraButtonState();
      }
      return;
    }
    
    // Funcionalidad para voltear cámara (cambiar entre frontal y trasera)
    console.log('[UI] Volteando cámara...');
    stopUserCamera();
    
    // Cambiar facingMode
    try {
      userCameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: userCameraStream?.getVideoTracks()[0]?.getSettings().facingMode === 'user' ? 'environment' : 'user'
        },
        audio: false
      });
      
      const userCameraVideo = document.getElementById('user-camera-video');
      const cameraWrapper = document.getElementById('user-camera-wrapper');
      
      if (userCameraVideo && cameraWrapper) {
        userCameraVideo.srcObject = userCameraStream;
        cameraWrapper.classList.add('active');
        console.log('[UI] Cámara volteada correctamente');
      }
    } catch (error) {
      console.error('[UI] Error al voltear cámara:', error);
    }
  };
}

// Función para actualizar estado visual del botón de compartir pantalla
function updateScreenShareButtonState() {
  if (!screenShareButton) return;
  
  const icon = screenShareButton.querySelector('.material-symbols-outlined');
  if (screenShareEnabled) {
    screenShareButton.classList.add('active');
    screenShareButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    if (icon) icon.textContent = 'stop_screen_share';
  } else {
    screenShareButton.classList.remove('active');
    screenShareButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    if (icon) icon.textContent = 'screen_share';
  }
}

// Botón de compartir pantalla
if (screenShareButton) {
  let screenShareStream = null;
  
  screenShareButton.onclick = async () => {
    screenShareEnabled = !screenShareEnabled;
    console.log('[UI] Compartir pantalla:', screenShareEnabled ? 'ACTIVADO' : 'DESACTIVADO');
    
    if (screenShareEnabled) {
      try {
        // Solicitar acceso a la pantalla
        screenShareStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        console.log('[UI] Pantalla compartida correctamente');
        updateScreenShareButtonState();
        
        // Manejar cuando el usuario detiene el compartir desde el navegador
        screenShareStream.getVideoTracks()[0].addEventListener('ended', () => {
          screenShareEnabled = false;
          updateScreenShareButtonState();
          console.log('[UI] Compartir pantalla detenido por el usuario');
        });
      } catch (error) {
        console.error('[UI] Error al compartir pantalla:', error);
        screenShareEnabled = false;
        updateScreenShareButtonState();
      }
    } else {
      // Detener compartir pantalla
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
        screenShareStream = null;
        console.log('[UI] Compartir pantalla detenido');
      }
      updateScreenShareButtonState();
    }
  };
  
  // Inicializar estado visual (desactivado por defecto)
  updateScreenShareButtonState();
}

// Bottom sheet
const bottomSheet = document.getElementById('bottom-sheet');
const closeSheetButton = document.getElementById('close-sheet');
const forceConnectButton = document.getElementById('force-connect-button');
const forceConversationButton = document.getElementById('force-conversation-button');
const testWordButton = document.getElementById('test-word-button');
const testAudioButton = document.getElementById('test-audio-button');

if (settingsButton) {
  settingsButton.onclick = () => {
    bottomSheet.classList.add('open');
  };
}

if (closeSheetButton) {
  closeSheetButton.onclick = () => {
    bottomSheet.classList.remove('open');
  };
}

if (forceConnectButton) {
  forceConnectButton.onclick = async () => {
    await connectToAvatar();
  };
}

if (forceConversationButton) {
  forceConversationButton.onclick = () => {
    startConversation();
  };
}

if (testWordButton) {
  testWordButton.onclick = () => {
    const streamWordButton = document.getElementById('stream-word-button');
    if (streamWordButton) streamWordButton.click();
  };
}

if (testAudioButton) {
  testAudioButton.onclick = () => {
    const streamAudioButton = document.getElementById('stream-audio-button');
    if (streamAudioButton) streamAudioButton.click();
  };
}

// Botón de colgar
if (hangupButton) {
  hangupButton.onclick = () => {
    stopConversation();
    stopUserCamera();
    if (ws) {
      const streamMessage = {
        type: 'delete-stream',
        payload: {
          session_id: sessionId,
          stream_id: streamId,
        },
      };
      sendMessage(ws, streamMessage);
      ws.close();
      ws = null;
    }
    stopAllStreams();
    closePC();
    updateConnectionStatus('error', 'Desconectado');
  };
}

// Modificar handlers de eventos para actualizar UI
// Handler de conexión ya está definido en onConnectionStateChange

// Auto-inicio deshabilitado - usar controles manuales

// Inicialización completa - el código está listo para ejecutarse
console.log('Avatar Realtime Agent inicializado correctamente');
console.log('DID_API configurado:', {
  service: DID_API.service,
  websocketUrl: DID_API.websocketUrl,
  hasKey: !!DID_API.key
});

// Auto-iniciar conexión al cargar la página (botón eliminado)
if (loadingOverlay) {
  // Esperar un momento para asegurar que el DOM esté listo
  setTimeout(async () => {
    if (!peerConnection || peerConnection.connectionState !== 'connected') {
      console.log('[INICIO] Auto-iniciando conexión con el avatar...');
      updateConnectionStatus('connecting', 'Conectando...');
      await connectToAvatar();
    }
  }, 500);
}

// Logs de debugging mejorados
console.log('Para iniciar el avatar:');
console.log('1. Abre el bottom sheet (botón de configuración)');
console.log('2. Presiona "Forzar Reconexión"');
console.log('3. Espera a que se establezca la conexión');