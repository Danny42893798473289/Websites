let pc = null;
let dc = null;
let signaling = null;
let stream = null;

class SignalingClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('WebSocket failed'));
      this.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        this.handlers.get(msg.type)?.forEach((h) => h(msg));
      };
    });
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}

async function getDesktopStream() {
  const sources = await window.hostAPI.getDesktopSources();
  const primary = sources.find((s) => s.name === 'Entire Screen') ?? sources[0];
  if (!primary) throw new Error('No screen source');

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: primary.id,
        maxFrameRate: 30,
      },
    },
  });
}

function cleanup() {
  dc?.close();
  dc = null;
  pc?.close();
  pc = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

async function startOffer() {
  cleanup();
  const iceServers = await window.hostAPI.getIceConfig();
  pc = new RTCPeerConnection({ iceServers });

  dc = pc.createDataChannel('input', { ordered: true });
  dc.onmessage = (ev) => {
    try {
      window.hostAPI.sendInput(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  };

  stream = await getDesktopStream();
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      signaling.send({ type: 'ice-candidate', candidate: ev.candidate.toJSON() });
    }
  };

  const meta = await window.hostAPI.getScreenMeta();
  signaling.send({ type: 'host-meta', ...meta });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signaling.send({ type: 'offer', sdp: offer });
  window.hostAPI.notifyStatus('Streaming');
}

async function handleAnswer(sdp) {
  if (pc) await pc.setRemoteDescription(sdp);
}

async function boot() {
  const url = await window.hostAPI.getSignalingUrl();
  signaling = new SignalingClient(url);

  try {
    await signaling.connect();
    const customPin = await window.hostAPI.getHostPin();
    signaling.send(
      customPin ? { type: 'create-room', pin: customPin } : { type: 'create-room' }
    );

    signaling.on('room-created', (msg) => {
      if (msg.type === 'room-created') window.hostAPI.setPin(msg.pin);
    });

    signaling.on('joined', (msg) => {
      if (msg.type === 'joined') window.hostAPI.setPin(msg.pin);
    });

    signaling.on('peer-joined', async (msg) => {
      if (msg.type === 'peer-joined' && msg.role === 'viewer') {
        window.hostAPI.notifyStatus('Viewer connected');
        await startOffer();
      }
    });

    signaling.on('answer', async (msg) => {
      if (msg.type === 'answer') await handleAnswer(msg.sdp);
    });

    signaling.on('ice-candidate', async (msg) => {
      if (msg.type === 'ice-candidate' && pc) {
        await pc.addIceCandidate(msg.candidate);
      }
    });

    signaling.on('peer-left', () => {
      cleanup();
      window.hostAPI.notifyStatus('Waiting for viewer');
    });

    window.hostAPI.onStopSharing(async () => {
      cleanup();
      signaling.close();
      await boot();
    });

    window.hostAPI.notifyStatus('Waiting for viewer');
  } catch (err) {
    console.error(err);
    window.hostAPI.notifyStatus('Reconnecting...');
    setTimeout(boot, 5000);
  }
}

boot();
