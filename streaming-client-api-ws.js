'use strict';

const fetchJsonFile = await fetch('./api.json');
const DID_API = await fetchJsonFile.json();

if (DID_API.key == '🤫') alert('Please put your api key inside ./api.json and restart..');

// Cargar configuración de OpenRouter
let OPENROUTER_CONFIG = null;
try {
  const openrouterJsonFile = await fetch('./openrouter.json');
  OPENROUTER_CONFIG = await openrouterJsonFile.json();
  if (!OPENROUTER_CONFIG.apiKey || OPENROUTER_CONFIG.apiKey === 'TU_API_KEY_AQUI') {
    console.warn('[CONFIG] ⚠️ OpenRouter API key no configurada en openrouter.json');
  }
} catch (error) {
  console.warn('[CONFIG] ⚠️ No se pudo cargar openrouter.json, usando valores por defecto');
}

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
          try {
            sessionClientAnswer = await createPeerConnection(offer, iceServers);
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
          color: '#FFFFFF', // Fondo blanco
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
    // Ocultar loading overlay si hay error
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
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
        // Ocultar loading overlay si aún está visible
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        updateStatusDisplay();
        console.log('[STREAM] Stream listo - El avatar puede hablar');
        console.log('[STREAM] Activa el micrófono para que el avatar te escuche');
      }
    }, 5000);
  } else if (state === 'connecting') {
    updateConnectionStatus('connecting', 'Conectando...');
  } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
    // Ocultar loading overlay si hay error o desconexión
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    updateConnectionStatus('error', 'Desconectado');
    stopAllStreams();
    closePC();
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
    
    // Asegurar que el audio esté habilitado cuando el video está activo
    if (streamVideoElement && isStreamReady) {
      streamVideoElement.muted = false;
      streamVideoElement.volume = 1.0;
    }
  } else {
    status = 'empty';
    // NO poner opacity a 0 - mantener el video idle visible
    // Solo cambiar la opacidad del stream, pero mantener el idle visible
    streamVideoOpacity = 0;
    
    // Asegurar que el video idle esté visible
    if (idleVideoElement) {
      idleVideoElement.style.opacity = 1;
      // Asegurar que el video idle esté reproduciéndose
      if (idleVideoElement.paused) {
        idleVideoElement.play().catch(e => {
          console.error('[VIDEO] Error al reproducir video idle:', e);
        });
      }
    }
  }

  if (streamVideoElement) {
    streamVideoElement.style.opacity = streamVideoOpacity;
  }
  
  if (idleVideoElement) {
    idleVideoElement.style.opacity = 1 - streamVideoOpacity;
    // Asegurar que siempre haya un video visible (idle o stream)
    if (streamVideoOpacity === 0 && idleVideoElement.paused) {
      idleVideoElement.play().catch(e => {
        console.error('[VIDEO] Error al reproducir video idle después de stream:', e);
      });
    }
  }

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
  if (!peerConnection) return;

  // Limpiar intervalo anterior si existe
  if (statsIntervalId) {
    clearInterval(statsIntervalId);
  }

  statsIntervalId = setInterval(async () => {
    try {
      // Verificar que peerConnection existe y está conectado
      if (!peerConnection || peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
        if (statsIntervalId) {
          clearInterval(statsIntervalId);
          statsIntervalId = null;
        }
        return;
      }

      // Usar getStats() sin parámetros para obtener todas las estadísticas
      const stats = await peerConnection.getStats();
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;

          if (videoStatusChanged) {
            videoIsPlaying = report.bytesReceived > lastBytesReceived;
            if (event.streams && event.streams[0]) {
              onVideoStatusChange(videoIsPlaying, event.streams[0]);
            }
          }
          lastBytesReceived = report.bytesReceived;
        }
      });
    } catch (error) {
      // Silenciar errores de getStats - no es crítico para la funcionalidad
      if (statsIntervalId) {
        clearInterval(statsIntervalId);
        statsIntervalId = null;
      }
    }
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

    
    switch (event) {
      case 'stream/started':
        status = 'started';
        // El avatar empezó a hablar - DETENER reconocimiento inmediatamente
        isAvatarSpeaking = true;
        if (recognition && (recognition.state === 'started' || recognition.state === 'starting')) {
          try {
            recognition.stop();
          } catch (e) {
            // Ignorar errores
          }
        }
        break;
      case 'stream/done':
        status = 'done';
        // El avatar terminó de hablar - Reiniciar reconocimiento automáticamente
        isAvatarSpeaking = false;
        setTimeout(() => {
          if (micEnabled && !processingResponse && recognition && !isStartingRecognition) {
            try {
              const state = recognition.state;
              if (state === 'stopped' || state === 'idle' || state === undefined || state === null) {
                isStartingRecognition = true;
                recognition.start();
              }
            } catch (e) {
              isStartingRecognition = false;
            }
          }
        }, 500);
        // Asegurar que el video idle se muestre cuando el stream termina
        setTimeout(() => {
          if (idleVideoElement) {
            idleVideoElement.style.opacity = 1;
            if (idleVideoElement.paused) {
              idleVideoElement.play().catch(e => {
                console.error('[STREAM EVENT] Error al reproducir video idle:', e);
              });
            }
          }
          // Asegurar que el stream video esté oculto
          if (streamVideoElement) {
            streamVideoElement.style.opacity = 0;
          }
        }, 200);
        break;
      case 'stream/ready':
        status = 'ready';
        break;
      case 'stream/error':
        status = 'error';
        break;
      default:
        status = 'dont-care';
        break;
    }

    // Set stream ready after a short delay, adjusting for potential timing differences between data and stream channels
    if (status === 'ready') {
      setTimeout(() => {
        isStreamReady = true;
        
        // IMPORTANTE: Habilitar audio del video del stream cuando esté listo
        if (streamVideoElement && streamVideoElement.srcObject) {
          streamVideoElement.muted = false;
          streamVideoElement.volume = 1.0;
        }
        
        if (streamEventLabel) {
          streamEventLabel.innerText = 'ready';
          streamEventLabel.className = 'streamEvent-ready';
        }
        // Ocultar loading overlay cuando el stream esté listo
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        updateStatusDisplay();
        
        // AUTO-INICIAR: Activar micrófono y conversación automáticamente cuando el stream esté listo
        if (!isConversationActive) {
          // Auto-activar micrófono si no está activo
          if (!micEnabled) {
            micEnabled = true;
            updateMicButtonState();
          }
          startConversation();
        }
        
        // Iniciar reconocimiento automáticamente si el micrófono está activo
        // Solo si no está ya iniciado o iniciándose
        if (micEnabled && recognition && !isStartingRecognition && !processingResponse) {
          try {
            const currentState = recognition.state;
            // Verificar más cuidadosamente - solo iniciar si realmente está detenido
            if (currentState === 'stopped' || currentState === 'idle') {
              // Doble verificación: esperar un momento y verificar de nuevo
              setTimeout(() => {
                if (micEnabled && recognition && !isStartingRecognition && !processingResponse) {
                  const state = recognition.state;
                  if (state === 'stopped' || state === 'idle') {
                    try {
                      isStartingRecognition = true;
                      recognition.start();
                    } catch (e) {
                      isStartingRecognition = false;
                      if (e.name !== 'InvalidStateError' || !e.message.includes('already started')) {
                        console.error('[ERROR] Error al iniciar reconocimiento:', e);
                      }
                    }
                  }
                }
              }, 200);
            }
          } catch (error) {
            isStartingRecognition = false;
            if (error.name !== 'InvalidStateError' || !error.message.includes('already started')) {
              console.error('[ERROR] Error al iniciar reconocimiento:', error);
            }
          }
        }
        
        // Iniciar análisis visual solo si la cámara ya está activa
        if (cameraEnabled && userCameraStream) {
          startPeriodicVisualAnalysis();
        }
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

  // Verificar estado antes de setRemoteDescription
  if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
    console.warn('[PEER] Estado de señalización inesperado:', peerConnection.signalingState);
  }
  
  await peerConnection.setRemoteDescription(offer);
  console.log('set remote sdp OK');

  // Verificar estado antes de createAnswer
  if (peerConnection.signalingState !== 'have-remote-offer') {
    console.warn('[PEER] Estado de señalización inesperado antes de createAnswer:', peerConnection.signalingState);
  }

  const sessionClientAnswer = await peerConnection.createAnswer();
  console.log('create local sdp OK');

  // Verificar estado antes de setLocalDescription
  if (peerConnection.signalingState !== 'have-remote-offer') {
    console.warn('[PEER] Estado de señalización inesperado antes de setLocalDescription:', peerConnection.signalingState);
  }

  await peerConnection.setLocalDescription(sessionClientAnswer);
  console.log('set local sdp OK');

  return sessionClientAnswer;
}

function setStreamVideoElement(stream) {
  if (!stream) {
    console.warn('[VIDEO] ⚠️ Stream no disponible para setStreamVideoElement');
    return;
  }

  streamVideoElement.srcObject = stream;
  streamVideoElement.loop = false;
  streamVideoElement.muted = !isStreamReady;
  streamVideoElement.volume = 1.0;

  // safari hotfix
  if (streamVideoElement.paused) {
    streamVideoElement
      .play()
      .catch((e) => {
        console.error('[VIDEO] ❌ Error al reproducir video del stream:', e);
      });
  }
}

function playIdleVideo() {
  const idleVideoSrc = DID_API.service == 'clips' ? 'alex_v2_idle.mp4' : 'emma_idle.mp4';
  console.log('[VIDEO] 🎬 Reproduciendo video idle:', idleVideoSrc);
  
  if (idleVideoElement) {
    idleVideoElement.src = idleVideoSrc;
    idleVideoElement.loop = true;
    idleVideoElement.muted = true; // Asegurar que esté silenciado
    idleVideoElement.style.opacity = 1; // Asegurar que esté visible
    
    // Asegurar que el video idle esté siempre visible cuando no hay stream
    if (streamVideoOpacity === 0) {
      idleVideoElement.style.opacity = 1;
    }
    
    idleVideoElement.play()
      .then(() => {
      })
      .catch((e) => {
        console.error('[VIDEO] ❌ Error al reproducir video idle:', e);
        // Intentar de nuevo después de un momento
        setTimeout(() => {
          if (idleVideoElement) {
            idleVideoElement.play().catch(err => {
              console.error('[VIDEO] ❌ Error al reintentar reproducir video idle:', err);
            });
          }
        }, 1000);
      });
  } else {
    console.warn('[VIDEO] ⚠️ Elemento idleVideoElement no encontrado');
  }
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
  // Solo actualizar elementos si existen (compatibilidad con nuevo diseño)
  if (iceGatheringStatusLabel) iceGatheringStatusLabel.innerText = '';
  if (signalingStatusLabel) signalingStatusLabel.innerText = '';
  if (iceStatusLabel) iceStatusLabel.innerText = '';
  if (peerStatusLabel) peerStatusLabel.innerText = '';
  if (streamEventLabel) streamEventLabel.innerText = '';
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
      resolve(ws);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      reject(err);
    };

    ws.onclose = () => {};
  });
}

function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    const messageStr = JSON.stringify(message);
    ws.send(messageStr);
  } else {
    console.error('[WS] ❌ WebSocket no está abierto. Estado:', ws.readyState);
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
let isInitializingRecognition = false; // Flag para prevenir múltiples inicializaciones simultáneas
let isStartingRecognition = false; // Flag para prevenir múltiples start() simultáneos

// Configuración de OpenRouter - Cargar desde openrouter.json o usar valores por defecto
const OPENROUTER_API_KEY = OPENROUTER_CONFIG?.apiKey || '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';
const OPENROUTER_MODEL = OPENROUTER_CONFIG?.model || 'deepseek/deepseek-chat';
const OPENROUTER_VISION_MODEL = OPENROUTER_CONFIG?.visionModel || 'deepseek/deepseek-chat';
const OPENROUTER_AUDIO_MODEL = OPENROUTER_CONFIG?.audioModel || 'openai/whisper';
// Asegurar que OPENROUTER_APP_URL tenga el protocolo https:// si no lo tiene
let OPENROUTER_APP_URL = OPENROUTER_CONFIG?.appUrl || 'http://localhost:3000';
if (OPENROUTER_APP_URL && !OPENROUTER_APP_URL.startsWith('http://') && !OPENROUTER_APP_URL.startsWith('https://')) {
  // Si no tiene protocolo, asumir HTTPS en producción
  OPENROUTER_APP_URL = window.location.protocol === 'https:' 
    ? `https://${OPENROUTER_APP_URL}` 
    : `http://${OPENROUTER_APP_URL}`;
}
const OPENROUTER_APP_NAME = OPENROUTER_CONFIG?.appName || 'Avatar Realtime Agent';

// Validar API key
if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'TU_API_KEY_AQUI') {
  // API key no configurada
}

// Variables de cámara
let userCameraStream = null;
let userCameraVideo = null;
let cameraAnalysisInterval = null;
let frameCaptureInterval = null; // Intervalo para captura rápida de frames
let lastAnalysisTime = 0;
const ANALYSIS_INTERVAL = 10000; // Analizar cada 10 segundos (reducido para evitar demasiadas peticiones)
const FRAME_CAPTURE_INTERVAL = 100; // Capturar frames cada 100ms (10 fps) para detección de gestos
let lastVisualAnalysis = null; // Almacenar último análisis visual para contexto
let processingResponse = false; // Flag para evitar procesar múltiples veces
let lastProcessedTranscript = ''; // Evitar procesar el mismo transcript dos veces
let isAvatarSpeaking = false; // Flag para saber si el avatar está hablando

// Sistema de cola para peticiones a OpenRouter (una a la vez)
let openRouterQueue = [];
let isProcessingOpenRouterRequest = false;
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 500; // Mínimo 500ms entre llamadas para evitar rate limiting

// Procesar cola de peticiones a OpenRouter con rate limiting inteligente
async function processOpenRouterQueue() {
  if (isProcessingOpenRouterRequest || openRouterQueue.length === 0) {
    return;
  }
  
  // Rate limiting: esperar si la última llamada fue muy reciente
  const timeSinceLastCall = Date.now() - lastApiCallTime;
  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    setTimeout(() => processOpenRouterQueue(), MIN_API_CALL_INTERVAL - timeSinceLastCall);
    return;
  }
  
  isProcessingOpenRouterRequest = true;
  const request = openRouterQueue.shift();
  
  try {
    lastApiCallTime = Date.now();
    const result = await request.fn();
    if (request.resolve) {
      request.resolve(result);
    }
  } catch (error) {
    // Si es error 429 (Too Many Requests), esperar más tiempo
    if (error.message && error.message.includes('429')) {
      console.error('[ERROR] Rate limit alcanzado, esperando 5 segundos...');
      setTimeout(() => {
        isProcessingOpenRouterRequest = false;
        processOpenRouterQueue();
      }, 5000);
      return;
    }
    
    if (request.reject) {
      request.reject(error);
    }
  } finally {
    isProcessingOpenRouterRequest = false;
    // Procesar siguiente petición en la cola con delay mínimo
    if (openRouterQueue.length > 0) {
      setTimeout(() => processOpenRouterQueue(), MIN_API_CALL_INTERVAL);
    }
  }
}

// Agregar petición a la cola
function queueOpenRouterRequest(fn) {
  return new Promise((resolve, reject) => {
    openRouterQueue.push({ fn, resolve, reject });
    processOpenRouterQueue();
  });
}

// Sistema de keep-alive para mantener la API activa (solo si no hay actividad)
let keepAliveInterval = null;
let lastUserActivity = Date.now();

function startKeepAlive() {
  if (keepAliveInterval) return;
  
  keepAliveInterval = setInterval(async () => {
    // Solo hacer keep-alive si no hay actividad reciente (más de 30 segundos)
    const timeSinceActivity = Date.now() - lastUserActivity;
    if (timeSinceActivity > 30000 && !isProcessingOpenRouterRequest && openRouterQueue.length === 0) {
      try {
        // Llamada simple de keep-alive (sin procesar respuesta)
        await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': OPENROUTER_APP_URL,
            'X-Title': OPENROUTER_APP_NAME,
            'X-Project-Type': 'academic',
            'Accept': 'application/json',
          },
        }).catch(() => {
          // Ignorar errores de keep-alive
        });
      } catch (e) {
        // Ignorar errores
      }
    }
  }, 60000); // Cada minuto
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Actualizar actividad del usuario
function updateUserActivity() {
  lastUserActivity = Date.now();
}

// Variables para detección de gestos con MediaPipe Hands
let handsDetector = null;
let gestureHistory = []; // Historial de gestos detectados (inicializar como array vacío)
let lastGesture = null;
let lastFrameHash = null; // Hash del último frame para detectar cambios

// Variables para captura de audio con MediaRecorder para Whisper
let audioRecorder = null;
let audioChunks = [];
let audioStreamForWhisper = null;
let isRecordingAudio = false;
const AUDIO_CHUNK_DURATION = 3000; // Enviar audio cada 3 segundos
let audioRecordingInterval = null;
let useWhisperAPI = false; // Usar Web Speech API (Whisper requiere API de OpenAI directamente, no disponible en OpenRouter)

// Función para detectar si el transcript es ruido
function isNoise(text) {
  const trimmed = text.trim().toLowerCase();
  
  // Solo considerar como ruido si es muy corto Y coincide con patrones específicos
  if (trimmed.length <= 1) {
    return true; // Letras o caracteres individuales
  }
  
  const noisePatterns = [
    /^(ah|eh|oh|hm|uh|um|ehh|ahh|ohh)$/i, // Solo sonidos de relleno muy específicos
  ];
  
  // Si es muy corto (1-2 caracteres) y coincide con patrones, es ruido
  if (trimmed.length <= 2 && noisePatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }
  
  return false;
}

// Función para verificar si el transcript tiene palabras completas
function hasCompleteWords(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  
  // Aceptar si tiene al menos 1 palabra de 2+ caracteres O 2 palabras de cualquier longitud
  return (words.length >= 1 && words.some(w => w.length >= 2)) ||
         words.length >= 2;
}

// Inicializar reconocimiento de voz
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome o Edge.');
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true; // Habilitar resultados intermedios para detectar audio inmediatamente
  recognition.lang = 'es-ES';
  recognition.maxAlternatives = 1;
  
  // Configuraciones adicionales para mejorar la detección
  // NO establecer grammars a null - algunos navegadores no lo permiten
  // El reconocimiento funcionará sin gramáticas específicas por defecto

  recognition.onresult = async (event) => {
    if (processingResponse) {
      return;
    }
    
    // CRÍTICO: Si el avatar está hablando y detectamos voz del usuario, DETENER el avatar inmediatamente
    if (isAvatarSpeaking) {
      // Detener el stream del avatar inmediatamente
      try {
        if (ws && ws.readyState === WebSocket.OPEN && streamId) {
          const stopMessage = {
            type: 'stop-stream',
            payload: {
              session_id: sessionId,
            },
          };
          ws.send(JSON.stringify(stopMessage));
          isAvatarSpeaking = false;
        }
      } catch (e) {
        // Ignorar errores
      }
    }
    
    // Buscar el último resultado final o el más reciente con suficiente confianza
    let finalTranscript = '';
    let hasFinalResult = false;
    
    // Primero buscar resultados finales
    for (let i = event.results.length - 1; i >= 0; i--) {
      const result = event.results[i];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence || 0.5;
        
        // Filtrar: debe tener palabras completas, buena confianza y no ser ruido
        if (transcript.length >= 2 && confidence > 0.3 && !isNoise(transcript) && hasCompleteWords(transcript)) {
          finalTranscript = transcript;
          hasFinalResult = true;
          break;
        }
      }
    }
    
    // Si no hay resultado final, verificar resultados intermedios con alta confianza
    if (!hasFinalResult) {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim();
      const confidence = lastResult[0].confidence || 0.5;
      
      // Procesar intermedios con confianza más baja para detectar voz más rápido
      if (transcript.length >= 2 && confidence > 0.4 && !isNoise(transcript) && hasCompleteWords(transcript)) {
        finalTranscript = transcript;
        hasFinalResult = true;
      }
    }
    
    // Si encontramos voz clara, DETENER INMEDIATAMENTE reconocimiento y procesar
    if (hasFinalResult && finalTranscript && finalTranscript !== lastProcessedTranscript && !processingResponse) {
      // Detener el reconocimiento INMEDIATAMENTE cuando se detecta cualquier voz
      try {
        recognition.stop();
        isStartingRecognition = false;
        processingResponse = true;
      } catch (e) {
        // Ignorar errores
      }
      
      lastProcessedTranscript = finalTranscript;
      
      updateUserMessage(finalTranscript);
      
      // Procesar respuesta inmediatamente (NO reiniciar reconocimiento aquí - se hará cuando el avatar termine)
      try {
        await getLLMResponse(finalTranscript);
      } catch (error) {
        console.error('[RECOGNITION] ❌ Error procesando respuesta:', error);
      } finally {
        // NO reiniciar aquí - esperar a que el avatar termine de hablar (stream/done)
        processingResponse = false;
        lastProcessedTranscript = ''; // Reset para permitir nuevas detecciones
      }
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      // Reiniciar si no hay habla detectada y no estamos procesando
      setTimeout(() => {
        if (!processingResponse && micEnabled && isConversationActive && recognition && !isStartingRecognition) {
          try {
            const state = recognition.state;
            if (state === 'stopped' || state === 'idle' || state === undefined) {
              isStartingRecognition = true;
              recognition.start();
            }
          } catch (e) {
            isStartingRecognition = false;
          }
        }
      }, 1000);
    } else if (event.error === 'not-allowed') {
      micEnabled = false;
      updateMicButtonState();
      alert('⚠️ Por favor, permite el acceso al micrófono en la configuración del navegador.');
    } else if (event.error === 'audio-capture') {
      micEnabled = false;
      updateMicButtonState();
      alert('⚠️ No se pudo acceder al micrófono. Verifica que esté conectado y funcionando.');
    }
  };

  recognition.onend = () => {
    isStartingRecognition = false;
    
    // Reiniciar automáticamente solo si no estamos procesando una respuesta
    if (!processingResponse && micEnabled && isConversationActive && recognition && !isStartingRecognition) {
      setTimeout(() => {
        try {
          const state = recognition.state;
          if ((state === 'stopped' || state === 'idle' || state === undefined) && !isStartingRecognition && !processingResponse) {
            isStartingRecognition = true;
            recognition.start();
          }
        } catch (e) {
          isStartingRecognition = false;
        }
      }, 300);
    }
  };
  
  recognition.onstart = () => {
    updateListeningStatus('🎤 Escuchando...');
    isStartingRecognition = false;
    isInitializingRecognition = false;
    processingResponse = false;
    
    if (!micEnabled) {
      micEnabled = true;
      updateMicButtonState();
    }
  };

  return recognition;
}

// ========== CAPTURA DE AUDIO CON MEDIARECORDER PARA WHISPER API ==========

// Inicializar captura de audio para Whisper
async function initAudioCaptureForWhisper() {
  try {
    // Obtener stream de audio del micrófono con configuración optimizada
    audioStreamForWhisper = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000 // Whisper funciona mejor con 16kHz
      } 
    });
    
    // Determinar el mejor formato de audio soportado
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }
    
    // Crear MediaRecorder
    audioRecorder = new MediaRecorder(audioStreamForWhisper, {
      mimeType: mimeType,
      audioBitsPerSecond: 16000
    });
    
    audioChunks = [];
    
    audioRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    audioRecorder.onstop = async () => {
      if (audioChunks.length > 0 && !processingResponse) {
        await processAudioWithWhisper();
      }
      audioChunks = [];
    };
    
    return true;
  } catch (error) {
    console.error('[AUDIO] Error al inicializar captura de audio:', error);
    return false;
  }
}

// Procesar audio con Whisper API
async function processAudioWithWhisper() {
  if (processingResponse || audioChunks.length === 0) return;
  
  try {
    processingResponse = true;
    
    // Crear blob del audio
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Verificar que el blob tenga contenido
    if (audioBlob.size < 100) {
      processingResponse = false;
      return;
    }
    
    // Crear FormData para enviar a Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', OPENROUTER_AUDIO_MODEL);
    formData.append('language', 'es');
    
    // Enviar a Whisper API a través de OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': OPENROUTER_APP_URL,
        'X-Title': OPENROUTER_APP_NAME,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const transcript = data.text?.trim() || '';
    
    // Si hay transcript válido, procesarlo
    if (transcript && transcript.length >= 3 && transcript !== lastProcessedTranscript && !isNoise(transcript) && hasCompleteWords(transcript)) {
      lastProcessedTranscript = transcript;
      updateUserMessage(transcript);
      
      // Detener grabación mientras procesamos
      if (audioRecorder && audioRecorder.state === 'recording') {
        audioRecorder.stop();
      }
      
      // Procesar respuesta del LLM
      await getLLMResponse(transcript);
      
      lastProcessedTranscript = '';
    }
    
    processingResponse = false;
    
    // Reiniciar grabación después de procesar
    if (micEnabled && isConversationActive && audioRecorder && audioRecorder.state === 'inactive') {
      setTimeout(() => {
        if (!processingResponse && micEnabled) {
          audioChunks = [];
          audioRecorder.start();
        }
      }, 500);
    }
    
  } catch (error) {
    console.error('[AUDIO] Error al procesar audio con Whisper:', error);
    processingResponse = false;
    
    // Reiniciar grabación después del error
    if (micEnabled && isConversationActive && audioRecorder && audioRecorder.state === 'inactive') {
      setTimeout(() => {
        if (!processingResponse && micEnabled) {
          audioChunks = [];
          audioRecorder.start();
        }
      }, 1000);
    }
  }
}

// Iniciar grabación de audio continua para Whisper
function startAudioRecordingForWhisper() {
  if (!audioRecorder || audioRecorder.state === 'recording') return;
  
  audioChunks = [];
  isRecordingAudio = true;
  
  // Iniciar grabación
  audioRecorder.start();
  
  // Enviar chunks periódicamente
  audioRecordingInterval = setInterval(() => {
    if (audioRecorder && audioRecorder.state === 'recording' && !processingResponse) {
      audioRecorder.stop(); // Esto dispara onstop que procesa el chunk
    }
  }, AUDIO_CHUNK_DURATION);
}

// Detener grabación de audio
function stopAudioRecordingForWhisper() {
  isRecordingAudio = false;
  
  if (audioRecordingInterval) {
    clearInterval(audioRecordingInterval);
    audioRecordingInterval = null;
  }
  
  if (audioRecorder && audioRecorder.state === 'recording') {
    audioRecorder.stop();
  }
  
  if (audioStreamForWhisper) {
    audioStreamForWhisper.getTracks().forEach(track => track.stop());
    audioStreamForWhisper = null;
  }
  
  audioChunks = [];
}

// Inicializar detector facial
async function initFaceDetector() {
  try {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
      runtime: 'tfjs',
      refineLandmarks: true,
      maxFaces: 5,
    };
    faceDetector = await faceLandmarksDetection.createDetector(model, detectorConfig);
    
    faceDetectionCanvas = document.createElement('canvas');
    faceDetectionCtx = faceDetectionCanvas.getContext('2d');
    return true;
  } catch (error) {
    return false;
  }
}

// Cargar MediaPipe Hands dinámicamente
async function loadMediaPipeHands() {
  return new Promise((resolve) => {
    // Si ya está cargado, resolver inmediatamente
    if (typeof Hands !== 'undefined') {
      resolve(true);
      return;
    }
    
    // Intentar cargar desde unpkg
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@mediapipe/hands@0.4.1675469404/hands.js';
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      console.log('[GESTOS] MediaPipe Hands cargado correctamente');
      resolve(true);
    };
    
    script.onerror = () => {
      console.warn('[GESTOS] No se pudo cargar MediaPipe Hands - La detección de gestos estará deshabilitada');
      resolve(false);
    };
    
    document.head.appendChild(script);
  });
}

// Inicializar detector de gestos con MediaPipe Hands (opcional)
async function initHandsDetector() {
  try {
    // Intentar cargar MediaPipe Hands dinámicamente
    const loaded = await loadMediaPipeHands();
    
    // Esperar un poco más para que se inicialice
    if (loaded) {
      let attempts = 0;
      while (typeof Hands === 'undefined' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
    }
    
    if (!loaded || typeof Hands === 'undefined') {
      console.warn('[GESTOS] MediaPipe Hands no está disponible - La detección de gestos estará deshabilitada');
      console.warn('[GESTOS] Esto NO afecta otras funcionalidades. La cámara, reconocimiento facial y análisis visual seguirán funcionando normalmente.');
      return false;
    }
    
    handsDetector = new Hands({
      locateFile: (file) => {
        // Usar unpkg como CDN
        return `https://unpkg.com/@mediapipe/hands@0.4.1675469404/${file}`;
      }
    });
    
    handsDetector.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    handsDetector.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const gesture = detectGesture(results.multiHandLandmarks[0]);
        if (gesture && gesture !== lastGesture) {
          lastGesture = gesture;
          gestureHistory.push({ gesture, timestamp: Date.now() });
          // Mantener solo los últimos 10 gestos
          if (gestureHistory.length > 10) {
            gestureHistory.shift();
          }
        }
      } else {
        lastGesture = null;
      }
    });
    
    console.log('[GESTOS] ✅ Detector de gestos inicializado correctamente');
    return true;
  } catch (error) {
    console.warn('[GESTOS] Error inicializando detector de gestos:', error);
    console.warn('[GESTOS] La detección de gestos estará deshabilitada, pero otras funcionalidades seguirán funcionando.');
    return false;
  }
}

// Detectar gestos basado en posiciones de las manos
function detectGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  
  // Índices de puntos clave de la mano
  const WRIST = 0;
  const THUMB_TIP = 4;
  const INDEX_TIP = 8;
  const MIDDLE_TIP = 12;
  const RING_TIP = 16;
  const PINKY_TIP = 20;
  
  // Calcular distancias
  const thumbUp = landmarks[THUMB_TIP].y < landmarks[WRIST].y;
  const indexUp = landmarks[INDEX_TIP].y < landmarks[WRIST].y;
  const middleUp = landmarks[MIDDLE_TIP].y < landmarks[WRIST].y;
  const ringUp = landmarks[RING_TIP].y < landmarks[WRIST].y;
  const pinkyUp = landmarks[PINKY_TIP].y < landmarks[WRIST].y;
  
  // Detectar gestos comunes
  if (indexUp && !middleUp && !ringUp && !pinkyUp) {
    return 'punto'; // Señalar
  } else if (indexUp && middleUp && !ringUp && !pinkyUp) {
    return 'victoria'; // V de victoria
  } else if (indexUp && middleUp && ringUp && pinkyUp && !thumbUp) {
    return 'saludo'; // Saludo con la mano
  } else if (indexUp && middleUp && ringUp && pinkyUp && thumbUp) {
    return 'mano_abierta'; // Mano abierta
  } else if (!indexUp && !middleUp && !ringUp && !pinkyUp && thumbUp) {
    return 'pulgar_arriba'; // Pulgar arriba
  } else if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbUp) {
    return 'puño'; // Puño cerrado
  }
  
  return null;
}

// Detectar gestos en un frame
async function detectGesturesInFrame(videoElement) {
  if (!handsDetector || !videoElement) {
    return null;
  }
  
  try {
    // MediaPipe Hands necesita un canvas o imagen
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    await handsDetector.send({ image: canvas });
    return lastGesture;
  } catch (error) {
    // Si falla, continuar sin gestos
    return null;
  }
}

// Detectar caras en el frame
async function detectFacesInFrame(videoElement) {
  if (!faceDetector || !videoElement) {
    return [];
  }

  try {
    faceDetectionCanvas.width = videoElement.videoWidth || 640;
    faceDetectionCanvas.height = videoElement.videoHeight || 480;
    faceDetectionCtx.drawImage(videoElement, 0, 0, faceDetectionCanvas.width, faceDetectionCanvas.height);
    
    const faces = await faceDetector.estimateFaces(faceDetectionCanvas, {
      flipHorizontal: false,
      staticImageMode: false,
    });
    
    return faces.map((face, index) => {
      const box = face.box;
      return {
        id: index,
        x: box.xMin,
        y: box.yMin,
        width: box.width,
        height: box.height,
        confidence: face.keypoints ? face.keypoints.length : 0,
      };
    });
  } catch (error) {
    return [];
  }
}

// Capturar frame de la cámara y convertir a base64 con detección facial
async function captureCameraFrame() {
  if (!userCameraVideo || !userCameraStream) {
    return { image: null, faces: [] };
  }

  try {
    // Verificar que el video esté realmente reproduciéndose y tenga datos
    if (userCameraVideo.readyState < 2) {
      // Esperar hasta que el video tenga datos
      await new Promise((resolve) => {
        const checkReady = () => {
          if (userCameraVideo.readyState >= 2) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });
    }
    
    // Verificar que el video tenga dimensiones válidas
    if (userCameraVideo.videoWidth === 0 || userCameraVideo.videoHeight === 0) {
      return { image: null, faces: [] };
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = userCameraVideo.videoWidth;
    canvas.height = userCameraVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Capturar frame actual del video
    ctx.drawImage(userCameraVideo, 0, 0, canvas.width, canvas.height);
    
    // Detectar caras (opcional, puede ser lento)
    let faces = [];
    try {
      faces = await detectFacesInFrame(userCameraVideo);
      detectedFaces = faces;
    } catch (faceError) {
      // Si falla la detección facial, continuar sin ella
    }
    
    // Convertir a base64 con calidad optimizada
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85); // Calidad balanceada
    
    return { image: imageBase64, faces: faces };
  } catch (error) {
    console.warn('[CÁMARA] Error capturando frame:', error);
    return { image: null, faces: [] };
  }
}

// Analizar el entorno visual usando visión del LLM con detección de personas
async function analyzeVisualEnvironment() {
  if (!userCameraStream || !userCameraVideo) {
    return null;
  }

  const frameData = await captureCameraFrame();
  if (!frameData.image) {
    return null;
  }

  // Construir prompt con información de caras detectadas
  let faceInfo = '';
  if (frameData.faces && frameData.faces.length > 0) {
    faceInfo = ` Se detectaron ${frameData.faces.length} persona(s) en la imagen.`;
    frameData.faces.forEach((face, index) => {
      faceInfo += ` Persona ${index + 1}: posición (${Math.round(face.x)}, ${Math.round(face.y)}), tamaño ${Math.round(face.width)}x${Math.round(face.height)}.`;
    });
  } else {
    faceInfo = ' No se detectaron personas en la imagen.';
  }

  // Usar cola para procesar una petición a la vez
  return queueOpenRouterRequest(async () => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_APP_URL,
        'X-Title': OPENROUTER_APP_NAME,
        'User-Agent': 'Avatar-Realtime-Agent/2.0',
        'Origin': window.location.origin,
        'X-Project-Type': 'academic',
        'X-Project-Description': 'Proyecto académico de investigación en IA conversacional',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        model: OPENROUTER_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analiza esta imagen del entorno del usuario en detalle.${faceInfo} 

Describe COMPLETAMENTE lo que ves:
- Personas: cantidad, posición aproximada, postura, expresión facial si es visible
- Objetos: muebles, dispositivos, decoración, cualquier objeto visible
- Ambiente: tipo de espacio (oficina, casa, habitación, etc.), tamaño aproximado
- Colores: colores dominantes en paredes, muebles, objetos
- Iluminación: nivel de luz (brillante, oscuro, natural, artificial), fuentes de luz visibles
- Detalles: cualquier detalle visible que pueda ser relevante (textos, pantallas, ventanas, puertas, etc.)
- Estado general: orden, limpieza, ambiente (tranquilo, activo, etc.)

Sé específico y detallado. NO inventes nada que no puedas ver claramente. Responde en español de forma profesional y completa.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: frameData.image.startsWith('data:image') ? frameData.image : `data:image/jpeg;base64,${frameData.image.split(',')[1] || frameData.image}`,
                  detail: 'high' // Alta resolución para mejor análisis
                }
              }
            ]
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    return null;
  }
}

// Obtener respuesta del LLM usando OpenRouter
async function getLLMResponse(userMessage) {
  try {
    // Asegurar que el reconocimiento esté detenido mientras procesamos
    if (recognition) {
      try {
        recognition.stop();
        isStartingRecognition = false;
        processingResponse = true; // Marcar que estamos procesando para evitar reinicios
      } catch (e) {
        // Ignorar errores
      }
    }
    
    updateListeningStatus('🤔 Pensando...');
    
    // Validar que el mensaje del usuario no esté vacío
    if (!userMessage || userMessage.trim() === '') {
      return;
    }
    
    // Preparar mensaje con imagen si la cámara está activa
    let userMessageContent = userMessage;
    let frameData = null;
    
    // SIEMPRE intentar capturar frame si la cámara está activa
    if (cameraEnabled && userCameraStream && userCameraVideo) {
      try {
        // Verificar que el video esté reproduciéndose
        if (userCameraVideo.paused || userCameraVideo.ended) {
          userCameraVideo.play().catch(() => {});
        }
        
        // Capturar frame actual (la función ya maneja el readyState)
        frameData = await captureCameraFrame();
        
        // Si no se capturó correctamente, intentar de nuevo con más tiempo
        if (!frameData || !frameData.image || !frameData.image.startsWith('data:image')) {
          await new Promise(resolve => setTimeout(resolve, 150));
          frameData = await captureCameraFrame();
          
          // Si aún falla, intentar una vez más
          if (!frameData || !frameData.image || !frameData.image.startsWith('data:image')) {
            await new Promise(resolve => setTimeout(resolve, 200));
            frameData = await captureCameraFrame();
          }
        }
      } catch (error) {
        console.warn('[LLM] Error capturando frame:', error);
        frameData = null;
      }
    }
    
    // Si hay imagen, incluirla directamente en el mensaje usando modelo de visión
    if (cameraEnabled && frameData && frameData.image && frameData.image.startsWith('data:image')) {
      const faceCount = frameData.faces ? frameData.faces.length : 0;
      let faceInfo = '';
      if (faceCount > 0) {
        faceInfo = ` Se detectaron ${faceCount} persona${faceCount > 1 ? 's' : ''} mediante reconocimiento facial.`;
      } else {
        faceInfo = ' No se detectaron personas mediante reconocimiento facial.';
      }
      
      // Agregar información de gestos detectados
      let gestureInfo = '';
      if (frameData.gesture) {
        gestureInfo = ` Gestos detectados: ${frameData.gesture}.`;
      }
      if (gestureHistory.length > 0) {
        const recentGestures = gestureHistory.slice(-3).map(g => g.gesture).join(', ');
        gestureInfo += ` Gestos recientes: ${recentGestures}.`;
      }
      
      // Asegurar que la imagen esté en formato correcto
      let imageUrl = frameData.image;
      if (!imageUrl.startsWith('data:image')) {
        imageUrl = `data:image/jpeg;base64,${imageUrl.split(',')[1] || imageUrl}`;
      }
      
      // Verificar que la imagen sea válida (debe tener al menos 100 caracteres para ser una imagen base64 válida)
      if (imageUrl.length < 100) {
        console.warn('[LLM] ⚠️ Imagen demasiado corta, puede ser inválida. Longitud:', imageUrl.length);
        frameData = null; // Invalidar frameData si la imagen no es válida
      } else {
        userMessageContent = [
          {
            type: 'text',
            text: `IMPORTANTE: Tienes acceso visual completo en tiempo real. Analiza la imagen adjunta en detalle.${faceInfo}${gestureInfo}

El usuario dice: "${userMessage}"

Analiza la imagen adjunta y responde basándote en lo que REALMENTE VES:
- Personas: cantidad, posición, características visibles, gestos y movimientos
- Objetos: muebles, dispositivos, decoración, cualquier objeto visible
- Ambiente: tipo de espacio, tamaño, características
- Colores: colores dominantes y detalles
- Iluminación: nivel de luz, fuentes visibles
- Gestos: movimientos de manos, expresiones, acciones visibles
- Detalles: cualquier detalle relevante visible

Responde usando la información visual de la imagen. NO digas que no tienes acceso visual. Tienes una imagen adjunta que debes analizar.`
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high' // Alta resolución para mejor análisis
            }
          }
        ];
      }
      
      // Obtener análisis visual detallado ANTES de enviar al LLM para tener más contexto
      const visualAnalysis = await analyzeVisualEnvironment();
      if (visualAnalysis) {
        lastVisualAnalysis = visualAnalysis; // Guardar último análisis
        updateVisualAnalysis(visualAnalysis);
        // Incluir análisis visual en el contexto del mensaje
        const analysisText = `\n\n[Análisis visual detallado del entorno: ${visualAnalysis}]`;
        if (Array.isArray(userMessageContent)) {
          userMessageContent[0].text += analysisText;
        }
      }
    } else if (lastVisualAnalysis) {
      // Si no hay cámara activa pero tenemos un análisis visual previo, usarlo
      const analysisText = `\n\n[Contexto visual del entorno: ${lastVisualAnalysis}]`;
      userMessageContent = userMessage + analysisText;
    }
    
    // Agregar mensaje del usuario al historial
    conversationHistory.push({ role: 'user', content: userMessageContent });
    
    // Mantener solo los últimos 10 mensajes para no exceder límites
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    // Determinar modelo a usar - SIEMPRE usar modelo de visión si hay imagen
    const modelToUse = frameData && frameData.image ? OPENROUTER_VISION_MODEL : OPENROUTER_MODEL;
    
    // Verificar que si hay imagen, se use modelo de visión
    if (frameData && frameData.image && modelToUse !== OPENROUTER_VISION_MODEL) {
      console.warn('[LLM] Advertencia: Hay imagen pero no se está usando modelo de visión');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_APP_URL,
        'X-Title': OPENROUTER_APP_NAME,
        'X-Project-Type': 'academic',
        'X-Project-Description': 'Proyecto académico de investigación en IA conversacional',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: 'system',
            content: `Eres un asistente virtual conversacional, amigable y natural. Hablas como una persona real en una conversación casual. 

REGLAS CRÍTICAS:
- Responde de forma MUY BREVE (máximo 1-2 oraciones, idealmente 1)
- NO uses emojis
- Mantén un tono conversacional y natural
- Para saludos simples como "hola", "cómo estás", responde con UNA SOLA ORACIÓN breve
- Solo menciona el entorno visual si el usuario pregunta específicamente por él
- NO describas el fondo o entorno a menos que el usuario lo pida explícitamente
- Responde como si estuvieras viendo y escuchando a la persona en tiempo real
- Mantén el contexto de la conversación de forma natural
- Sé directo y conciso`
          },
          ...conversationHistory
        ],
        stream: false,
        max_tokens: 50, // Respuestas MUY cortas (1-2 oraciones máximo)
        temperature: 0.7, // Respuestas más consistentes
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage += ` - ${errorJson.error.message}`;
        } else {
          errorMessage += ` - ${errorText}`;
        }
      } catch {
        errorMessage += ` - ${errorText}`;
      }
      
      // Si es error 401, sugerir verificar la API key
      if (response.status === 401) {
        errorMessage += '\n⚠️ Verifica que tu API key de OpenRouter sea válida en config.env';
        console.error('[ERROR] API key de OpenRouter inválida o expirada');
        console.error('[ERROR] Verifica config.env y asegúrate de que OPENROUTER_API_KEY sea correcta');
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Obtener la respuesta y eliminar emojis
    let aiResponse = data.choices?.[0]?.message?.content || '';
    
    // Eliminar emojis de la respuesta
    aiResponse = aiResponse
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emojis de caras
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Emojis de símbolos
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Emojis de transporte
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Banderas
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Símbolos varios
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variación selectora
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Emojis suplementarios
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Emojis extendidos
      .trim();
    
    // Limitar longitud de respuesta (máximo 200 palabras o ~1000 caracteres)
    if (aiResponse.length > 1000) {
      // Truncar a 200 palabras
      const words = aiResponse.split(/\s+/);
      if (words.length > 200) {
        aiResponse = words.slice(0, 200).join(' ') + '...';
      } else {
        // Si tiene menos de 200 palabras pero más de 1000 caracteres, truncar por caracteres
        aiResponse = aiResponse.substring(0, 1000) + '...';
      }
    }
    
    // Si la respuesta está vacía después de eliminar emojis, intentar retry
    if (!aiResponse || aiResponse === '') {
      const retryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': OPENROUTER_APP_URL,
          'X-Title': OPENROUTER_APP_NAME,
          'X-Project-Type': 'academic',
          'X-Project-Description': 'Proyecto académico de investigación en IA conversacional',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: conversationHistory.slice(-3),
          stream: false,
        }),
      });
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        aiResponse = retryData.choices?.[0]?.message?.content || '';
        // Eliminar emojis también del retry
        aiResponse = aiResponse
          .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
          .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
          .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
          .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
          .replace(/[\u{2600}-\u{26FF}]/gu, '')
          .replace(/[\u{2700}-\u{27BF}]/gu, '')
          .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
          .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
          .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
          .trim();
        
        if (aiResponse && aiResponse !== '') {
          updateAIResponse(aiResponse);
          conversationHistory.push({ role: 'assistant', content: aiResponse });
          await sendTextToAvatar(aiResponse);
          updateListeningStatus('🎤 Escuchando...');
          return;
        }
      }
      
      throw new Error('El modelo no generó una respuesta válida. Intenta de nuevo.');
    }
    
    updateAIResponse(aiResponse);
    
    // Agregar respuesta del asistente al historial
    conversationHistory.push({ role: 'assistant', content: aiResponse });
    
    // Enviar respuesta al avatar (ya sin emojis)
    await sendTextToAvatar(aiResponse);
    
    // Marcar que terminamos de procesar
    processingResponse = false;
    
    updateListeningStatus('🎤 Escuchando...');
    
    // Reiniciar reconocimiento después de un delay más largo para que el avatar termine de hablar
    setTimeout(() => {
      if (micEnabled && isConversationActive && recognition && !isStartingRecognition && !processingResponse) {
        try {
          isStartingRecognition = true;
          recognition.start();
        } catch (e) {
          isStartingRecognition = false;
        }
      }
    }, 2000); // Delay más largo (2 segundos) para evitar interrupciones mientras el avatar habla
  } catch (error) {
    updateListeningStatus('❌ Error: ' + error.message.substring(0, 50));
    
    setTimeout(() => {
      if (isConversationActive) {
        updateListeningStatus('🎤 Escuchando...');
        // Reiniciar reconocimiento después del error
        if (micEnabled && recognition && !isStartingRecognition && !processingResponse) {
          try {
            isStartingRecognition = true;
            recognition.start();
          } catch (e) {
            isStartingRecognition = false;
          }
        }
      }
    }, 3000);
  }
}

// Enviar texto al avatar usando streaming
// Enviar texto al avatar para que hable
// Esta función funciona SIEMPRE, independientemente del estado de micEnabled o cameraEnabled
// Los botones solo controlan el INPUT del usuario, no la capacidad del avatar de hablar
async function sendTextToAvatar(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[AVATAR] ❌ WebSocket no está abierto. Estado:', ws?.readyState);
    return;
  }
  
  if (!streamId || !sessionId) {
    console.error('[AVATAR] ❌ streamId o sessionId no están disponibles');
    console.error('[AVATAR] streamId:', streamId);
    console.error('[AVATAR] sessionId:', sessionId);
    return;
  }
  
  // Esperar a que el stream esté listo con retry
  if (!isStreamReady) {
    // Esperar hasta 5 segundos para que el stream esté listo
    let retries = 0;
    const maxRetries = 50; // 50 intentos x 100ms = 5 segundos
    
    while (!isStreamReady && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!isStreamReady) {
      console.error('[ERROR] Stream no está listo después de esperar');
      return;
    }
  }
  

  // Limpiar el texto, eliminar emojis y prepararlo para SSML
  const cleanText = text.trim()
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emojis de caras
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Emojis de símbolos
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Emojis de transporte
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Banderas
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Símbolos varios
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variación selectora
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Emojis suplementarios
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Emojis extendidos
    .trim();
    
  if (!cleanText) {
    return;
  }

  // Dividir el texto en frases o chunks más grandes (no palabra por palabra)
  // Dividir por oraciones o puntos para mejor fluidez
  const sentences = cleanText.split(/([.!?]+\s*)/).filter(s => s.trim().length > 0);
  const chunks = [];
  
  // Agrupar oraciones en chunks de máximo 50 palabras
  let currentChunk = '';
  for (const sentence of sentences) {
    const wordsInChunk = currentChunk.split(/\s+/).filter(w => w.length > 0).length;
    const wordsInSentence = sentence.split(/\s+/).filter(w => w.length > 0).length;
    
    if (wordsInChunk + wordsInSentence > 50 && currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  // Si no hay chunks (texto muy corto), enviar todo junto
  if (chunks.length === 0) {
    chunks.push(cleanText);
  }


  // Enviar cada chunk
  for (const [index, chunk] of chunks.entries()) {
    const isLastChunk = index === chunks.length - 1;
    const inputText = chunk + (isLastChunk ? ' <break time="500ms" />' : ' ');
    
    const streamMessage = {
      type: 'stream-text',
      payload: {
        script: {
          type: 'text',
          input: inputText,
          provider: {
            type: 'microsoft',
            voice_id: 'es-ES-ElviraNeural', // Voz en español
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
          color: '#FFFFFF', // Fondo blanco
        },
        index,
        session_id: sessionId,
        stream_id: streamId,
        presenter_type: PRESENTER_TYPE,
      },
    };

    try {
      sendMessage(ws, streamMessage);
    } catch (error) {
      console.error(`[AVATAR] ❌ Error al enviar chunk ${index + 1}:`, error);
    }
    
    // Sin delay entre chunks para respuesta más rápida
  }
  
  // Enviar mensaje final vacío para indicar fin del stream
  const finalMessage = {
    type: 'stream-text',
    payload: {
      script: {
        type: 'text',
        input: '',
        provider: {
          type: 'microsoft',
          voice_id: 'es-ES-ElviraNeural',
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
        color: '#FFFFFF', // Fondo blanco
      },
      index: chunks.length,
      session_id: sessionId,
      stream_id: streamId,
      presenter_type: PRESENTER_TYPE,
    },
  };
  
  sendMessage(ws, finalMessage);
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

// Iniciar cámara del usuario - TODO se maneja manualmente
async function startUserCamera() {
  try {
    console.log('[CÁMARA] 📷 Usuario activando cámara - Solicitando permisos...');
    
    // Solicitar permisos de cámara explícitamente con configuración optimizada
    userCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 },
        facingMode: 'user', // Cámara frontal
        frameRate: { ideal: 30, min: 15 } // Frame rate para tiempo real
      },
      audio: false
    });


    userCameraVideo = document.getElementById('user-camera-video');
    const cameraWrapper = document.getElementById('user-camera-wrapper');

    if (userCameraVideo && cameraWrapper) {
      userCameraVideo.srcObject = userCameraStream;
      
      // Asegurar que el video se reproduzca automáticamente
      userCameraVideo.autoplay = true;
      userCameraVideo.playsInline = true;
      userCameraVideo.muted = true; // Necesario para autoplay en algunos navegadores
      
      // Forzar reproducción
      userCameraVideo.play().catch(err => {
        console.warn('[CÁMARA] Error al reproducir video:', err);
      });
      
      cameraWrapper.classList.add('active');
      cameraWrapper.classList.add('camera-active');

      // Inicializar detectores
      initFaceDetector().then(success => {
        if (success) {
          console.log('[CÁMARA] ✅ Detector facial inicializado');
        }
      });
      
      // Inicializar detector de gestos (opcional, no bloquea si falla)
      initHandsDetector().then(success => {
        if (success) {
          console.log('[CÁMARA] ✅ Detector de gestos inicializado');
        } else {
          console.log('[CÁMARA] ℹ️ Detector de gestos no disponible - continuando sin gestos (esto es normal)');
        }
      }).catch(err => {
        console.warn('[CÁMARA] ⚠️ Error al inicializar detector de gestos:', err);
      });
      
      // Iniciar captura rápida de frames para detección de gestos (funciona incluso sin MediaPipe)
      startFastFrameCapture();
      
      // Iniciar análisis periódico del entorno solo si el stream está listo
      if (isStreamReady) {
        startPeriodicVisualAnalysis();
      } else {
        console.log('[CÁMARA] ⚠️ Stream no está listo aún - El análisis visual se iniciará cuando el avatar esté conectado');
      }
      
    }
  } catch (error) {
    console.error('[CÁMARA] ❌ Error al acceder a la cámara:', error);
    cameraEnabled = false;
    // El manejo de errores se hace en el botón de cámara, no aquí
    // Solo relanzar el error para que el botón lo maneje
    throw error;
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

// Captura rápida de frames para detección de gestos y visión en tiempo real
function startFastFrameCapture() {
  stopFastFrameCapture(); // Asegurarse de que no haya otro intervalo activo
  
  frameCaptureInterval = setInterval(async () => {
    if (userCameraStream && userCameraVideo && cameraEnabled) {
      try {
        // Capturar frame rápidamente (sin análisis completo del LLM)
        const frameData = await captureCameraFrame();
        
        // Actualizar información de gestos si se detectó alguno
        if (frameData.gesture) {
          // Los gestos ya se guardan automáticamente en gestureHistory
        }
      } catch (error) {
        // Ignorar errores en captura rápida
      }
    }
  }, FRAME_CAPTURE_INTERVAL);
}

function stopFastFrameCapture() {
  if (frameCaptureInterval) {
    clearInterval(frameCaptureInterval);
    frameCaptureInterval = null;
  }
}

// Análisis periódico del entorno visual
function startPeriodicVisualAnalysis() {
  stopPeriodicVisualAnalysis(); // Asegurarse de que no haya otro intervalo activo
  
  // Hacer un análisis inmediato al iniciar para tener contexto desde el principio
  if (userCameraStream && userCameraVideo) {
    analyzeVisualEnvironment().then(analysis => {
      if (analysis) {
        lastVisualAnalysis = analysis;
        updateVisualAnalysis(analysis);
      }
    });
  }
  
  cameraAnalysisInterval = setInterval(async () => {
    if (userCameraStream && userCameraVideo) {
      const analysis = await analyzeVisualEnvironment();
      if (analysis) {
        lastVisualAnalysis = analysis; // Guardar último análisis para contexto
        updateVisualAnalysis(analysis);
      }
    }
  }, ANALYSIS_INTERVAL);
}

function stopPeriodicVisualAnalysis() {
  if (cameraAnalysisInterval) {
    clearInterval(cameraAnalysisInterval);
    cameraAnalysisInterval = null;
  }
  stopFastFrameCapture();
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

  // Iniciar keep-alive para mantener la API activa
  startKeepAlive();

  if (!isStreamReady) {
    // Esperar a que el stream esté listo
    let retries = 0;
    while (!isStreamReady && retries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    if (!isStreamReady) {
      console.error('[ERROR] Stream no está listo después de esperar');
      return;
    }
  }

  // Inicializar reconocimiento de voz (pero NO iniciarlo automáticamente)
  // El reconocimiento solo se iniciará cuando el usuario active el micrófono
  if (!recognition) {
    recognition = initSpeechRecognition();
    if (!recognition) {
      console.warn('[CONVERSACIÓN] No se pudo inicializar reconocimiento de voz');
      // Continuar de todas formas - el avatar puede hablar sin reconocimiento
    } else {
      console.log('[CONVERSACIÓN] ✅ Reconocimiento de voz inicializado (esperando activación del micrófono)');
    }
  }

  isConversationActive = true;
  conversationHistory = []; // Reiniciar historial
  
  console.log('[CONVERSACIÓN] ✅ Conversación iniciada - El avatar puede hablar y responder');
  console.log('[CONVERSACIÓN] ℹ️ Activa el micrófono para que el avatar te escuche');
  console.log('[CONVERSACIÓN] Estado micrófono usuario:', micEnabled ? 'ACTIVO (puedes hablar)' : 'INACTIVO (activa el botón de micrófono)');
  console.log('[CONVERSACIÓN] Estado cámara usuario:', cameraEnabled ? 'ACTIVA (puedes ser visto)' : 'INACTIVA (no puedes ser visto)');
  
  // Mantener UI de conversación oculta por defecto
  if (conversationStatusEl) {
    conversationStatusEl.style.display = 'none';
    conversationStatusEl.classList.remove('active');
  }
  
  // NOTA: Los permisos ahora se solicitan manualmente cuando el usuario activa el botón de micrófono
  // Esta función solo marca la conversación como activa, pero NO solicita permisos automáticamente
  console.log('[CONVERSACIÓN] Conversación iniciada - El avatar puede hablar');
  console.log('[CONVERSACIÓN] Estado micrófono usuario:', micEnabled ? 'ACTIVO (puedes hablar)' : 'INACTIVO (activa el botón de micrófono para hablar)');
  console.log('[CONVERSACIÓN] Estado cámara usuario:', cameraEnabled ? 'ACTIVA (puedes ser visto)' : 'INACTIVA (activa el botón de cámara para ser visto)');
  
  // Si el micrófono ya está activo, el reconocimiento ya debería estar corriendo
  // (se inició cuando el usuario activó el botón de micrófono)
  if (micEnabled && recognition) {
    console.log('[CONVERSACIÓN] Micrófono ya activo - Reconocimiento debería estar corriendo');
  } else {
    console.log('[CONVERSACIÓN] Activa el botón de micrófono para que el avatar te escuche');
  }
}

// Función reutilizable para detener conversación
function stopConversation() {
  isConversationActive = false;
  
  // Detener keep-alive cuando se detiene la conversación
  stopKeepAlive();
  
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
const stopListeningButton = document.getElementById('stop-listening-button');
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

// Control de micrófono - Solo afecta el INPUT del usuario, no el avatar
// TODO se maneja manualmente - el usuario debe activar el botón para solicitar permisos
if (micButton) {
  micButton.onclick = async () => {
    // Prevenir múltiples clics simultáneos
    if (isInitializingRecognition || isStartingRecognition) {
      console.log('[UI] ⚠️ Ya se está inicializando el reconocimiento, espera...');
      return;
    }
    
    if (!micEnabled) {
      // ACTIVAR MICRÓFONO - Solicitar permisos manualmente
      
      // Verificar que el stream esté listo - pero permitir activar el micrófono de todas formas
      // El reconocimiento se iniciará cuando el stream esté listo
      if (!isStreamReady) {
        console.warn('[UI] ⚠️ Stream no está listo aún, pero puedes activar el micrófono. El reconocimiento comenzará cuando el stream esté listo.');
        // Continuar con la activación del micrófono - no retornar
      }
      
      // Marcar que estamos inicializando
      isInitializingRecognition = true;
      
      try {
        // Usar Whisper API en lugar de Web Speech API
        if (useWhisperAPI) {
          // 1. Inicializar captura de audio para Whisper
          const audioInitSuccess = await initAudioCaptureForWhisper();
          if (!audioInitSuccess) {
            console.error('[UI] ❌ No se pudo inicializar captura de audio para Whisper');
            micEnabled = false;
            updateMicButtonState();
            isInitializingRecognition = false;
            return;
          }
          
          // 2. Iniciar conversación si no está activa
          if (!isConversationActive) {
            console.log('[UI] 🎤 Iniciando conversación con Whisper API...');
            isConversationActive = true;
            conversationHistory = [];
          }
          
          // 3. Iniciar grabación de audio continua
          startAudioRecordingForWhisper();
          
          micEnabled = true;
          isInitializingRecognition = false;
          updateMicButtonState();
          console.log('[UI] ✅ Micrófono ACTIVADO con Whisper API - Puedes hablar con el avatar');
        } else {
          // Código original con Web Speech API (fallback)
          // 1. Solicitar permisos de micrófono explícitamente
          console.log('[UI] 📢 Solicitando permisos de micrófono...');
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('[UI] ✅ Permisos de micrófono otorgados');
          
          // Detener el stream inmediatamente, solo necesitábamos los permisos
          audioStream.getTracks().forEach(track => track.stop());
          
          // 2. Inicializar reconocimiento de voz si no existe
          if (!recognition) {
            recognition = initSpeechRecognition();
            if (!recognition) {
              console.error('[UI] ❌ No se pudo inicializar reconocimiento de voz');
              micEnabled = false;
              updateMicButtonState();
              return;
            }
          }
          
          // 3. Iniciar conversación si no está activa
          if (!isConversationActive) {
            isConversationActive = true;
            conversationHistory = [];
          }
          
          // 4. Esperar un momento para asegurar que el reconocimiento esté listo
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // 5. Iniciar reconocimiento de voz solo si el stream está listo
          if (isStreamReady) {
            const currentState = recognition.state;
            if (currentState !== 'started' && currentState !== 'starting' && !isStartingRecognition) {
              isStartingRecognition = true;
              
              try {
                recognition.start();
                await new Promise(resolve => setTimeout(resolve, 300));
                micEnabled = true;
                isStartingRecognition = false;
                // Mostrar botón de detener
                if (stopListeningButton) {
                  stopListeningButton.style.display = 'flex';
                }
                console.log('[UI] ✅ Reconocimiento de voz iniciado correctamente');
              } catch (error) {
                isStartingRecognition = false;
                console.error('[ERROR] Error al iniciar reconocimiento:', error);
                if (error.name === 'InvalidStateError') {
                  micEnabled = true;
                } else {
                  micEnabled = false;
                }
              }
            } else {
              micEnabled = true;
            }
          } else {
            // Stream no está listo - marcar micrófono como activo pero no iniciar reconocimiento aún
            micEnabled = true;
            console.log('[UI] ⏳ Micrófono activado, esperando a que el stream esté listo para iniciar reconocimiento...');
          }
          
          updateMicButtonState();
          isInitializingRecognition = false;
        }
      } catch (error) {
        isInitializingRecognition = false; // Liberar el flag en caso de error
        isStartingRecognition = false; // También liberar el flag de inicio
        console.error('[UI] ❌ Error al solicitar permisos de micrófono:', error);
        micEnabled = false;
        updateMicButtonState();
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          alert('⚠️ Permisos de micrófono denegados. Por favor, permite el acceso al micrófono en la configuración del navegador.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          alert('⚠️ No se encontró ningún micrófono. Por favor, conecta un micrófono e intenta de nuevo.');
        } else {
          alert('⚠️ Error al acceder al micrófono: ' + error.message);
        }
      }
      
    } else {
      // DESACTIVAR MICRÓFONO
      micEnabled = false;
      updateMicButtonState();
      
      // Detener reconocimiento de voz - El usuario ya no puede hablar
      // PERO el avatar puede seguir hablando normalmente
      if (useWhisperAPI) {
        stopAudioRecordingForWhisper();
        console.log('[UI] ✅ Grabación de audio con Whisper detenida - Ya no puedes hablar');
        console.log('[UI] ℹ️ El avatar puede seguir hablando normalmente');
        updateListeningStatus('');
      } else if (recognition) {
        try {
          recognition.stop();
          updateListeningStatus('');
          // Ocultar botón de detener
          if (stopListeningButton) {
            stopListeningButton.style.display = 'none';
          }
        } catch (error) {
          console.error('[UI] Error al detener reconocimiento:', error);
        }
      }
    }
  };
  
  // Inicializar estado visual (desactivado por defecto)
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

// Control de cámara - Solo afecta si el USUARIO puede ser visto, no el avatar
if (cameraButton) {
  cameraButton.onclick = async () => {
    if (!cameraEnabled) {
      // ACTIVAR CÁMARA - Solicitar permisos manualmente
      
      try {
        await startUserCamera();
        cameraEnabled = true;
        updateCameraButtonState();
        console.log('[UI] ✅ Cámara ACTIVADA - El avatar puede verte');
        
        // Iniciar análisis visual periódico para que el avatar vea al usuario
        if (isStreamReady) {
          startPeriodicVisualAnalysis();
          console.log('[UI] ✅ Análisis visual iniciado - El avatar está analizando tu entorno');
        } else {
          console.log('[UI] ⚠️ Stream no está listo aún - El análisis visual se iniciará cuando el avatar esté conectado');
        }
      } catch (error) {
        console.error('[UI] ❌ Error al activar cámara:', error);
        cameraEnabled = false;
        updateCameraButtonState();
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          alert('⚠️ Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración del navegador.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          alert('⚠️ No se encontró ninguna cámara. Por favor, conecta una cámara e intenta de nuevo.');
        } else {
          alert('⚠️ Error al acceder a la cámara: ' + error.message);
        }
      }
    } else {
      // DESACTIVAR CÁMARA
      stopUserCamera();
      stopPeriodicVisualAnalysis();
      cameraEnabled = false;
      updateCameraButtonState();
      console.log('[UI] ✅ Cámara DESACTIVADA - Ya no puedes ser visto');
      console.log('[UI] ℹ️ El avatar sigue visible normalmente');
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

// Botón para detener reconocimiento de voz
if (stopListeningButton) {
  stopListeningButton.onclick = () => {
    if (recognition) {
      try {
        recognition.stop();
        isStartingRecognition = false;
        processingResponse = true; // Evitar reinicio automático
        micEnabled = false;
        updateMicButtonState();
        updateListeningStatus('');
        stopListeningButton.style.display = 'none';
      } catch (error) {
        console.error('[UI] Error al detener reconocimiento:', error);
      }
    }
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
// Inicializar detector facial al cargar
(async function initOnLoad() {
  await initFaceDetector();
})();

// Auto-iniciar conexión al cargar la página
(async function autoInit() {
  // Esperar un momento para asegurar que el DOM esté listo
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Asegurar que el video idle esté configurado desde el inicio
  if (idleVideoElement) {
    console.log('[INICIO] Configurando video idle...');
    playIdleVideo();
  }
  
  if (loadingOverlay) {
    // Mostrar loading overlay mientras se conecta
    loadingOverlay.classList.remove('hidden');
  }
  
  if (!peerConnection || peerConnection?.connectionState !== 'connected') {
    updateConnectionStatus('connecting', 'Conectando...');
    try {
      await connectToAvatar();
    } catch (error) {
      console.error('[INICIO] Error al conectar:', error);
      if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
      }
      updateConnectionStatus('error', 'Error de conexión');
    }
  } else {
    // Ya está conectado, ocultar loading
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }
})();

// Logs de debugging mejorados
console.log('Para iniciar el avatar:');
console.log('1. Abre el bottom sheet (botón de configuración)');
console.log('2. Presiona "Forzar Reconexión"');
console.log('3. Espera a que se establezca la conexión');