// AudioRecorder: wraps MediaRecorder with MIME detection and 20-min cap

const MAX_DURATION_MS = 20 * 60 * 1000; // 20 minutes

function selectMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ''; // Let the browser choose; read recorder.mimeType after construction
}

export class AudioRecorder {
  constructor() {
    this._recorder = null;
    this._chunks = [];
    this._stream = null;
    this._maxTimer = null;
    this.mimeType = '';
    this._resolveStop = null;
    this._rejectStop = null;
  }

  async start() {
    if (this._recorder) throw new Error('Already recording');

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._chunks = [];

    const mimeType = selectMimeType();
    const options = mimeType ? { mimeType } : {};

    this._recorder = new MediaRecorder(this._stream, options);
    this.mimeType = this._recorder.mimeType || mimeType || 'audio/webm';

    this._recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this._chunks.push(e.data);
    };

    // Promise that resolves when recorder finishes stopping
    const stopPromise = new Promise((resolve, reject) => {
      this._resolveStop = resolve;
      this._rejectStop = reject;
    });

    this._recorder.onstop = () => {
      const blob = new Blob(this._chunks, { type: this.mimeType });
      const reader = new FileReader();
      reader.onload = () => {
        const buf = reader.result;
        const arr = Array.from(new Uint8Array(buf));
        this._cleanup();
        this._resolveStop({ data: arr, mimeType: this.mimeType });
      };
      reader.onerror = () => {
        this._cleanup();
        this._rejectStop(new Error('Failed to read audio data'));
      };
      reader.readAsArrayBuffer(blob);
    };

    this._recorder.start(1000); // collect in 1-second chunks

    // 20-minute auto-stop
    this._maxTimer = setTimeout(() => {
      this._maxTimerFired = true;
      this.stop();
    }, MAX_DURATION_MS);

    return stopPromise;
  }

  stop() {
    if (!this._recorder || this._recorder.state === 'inactive') return;
    clearTimeout(this._maxTimer);
    this._recorder.stop();
  }

  _cleanup() {
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
    }
    this._recorder = null;
    this._chunks = [];
    this._maxTimer = null;
    this._maxTimerFired = false;
  }

  get isMaxTimerFired() {
    return !!this._maxTimerFired;
  }
}
