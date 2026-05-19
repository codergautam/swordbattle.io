import * as Protocol from './Protocol';

const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
window.socket = null;

const enableDecodeWorker = false;

class Socket {
  private socket: null | WebSocket;
  private queue: any[];
  private debugMode: boolean = false;

  private decoder: Worker | null = null;
  private usingWorker = false;
  private seq = 0;
  private onMessage: ((payload: any) => void) | null = null;

  constructor() {
    this.socket = null;
    this.queue = [];

    try {
      this.debugMode = window.location.search.includes("debugAlertMode");
      } catch(e) {}

    if (enableDecodeWorker) this.initDecoder();
  }

  private initDecoder() {
    try {
      const w = new Worker(new URL('./decoder.worker.ts', import.meta.url));
      w.onmessage = (e: MessageEvent) => {
        const d = e.data || {};
        if (d.ready) { this.usingWorker = true; return; }
        if (!this.usingWorker) return;
        if (d.error) { console.warn('[Socket] worker decode error:', d.error); return; }
        if (d.payload && this.onMessage) this.onMessage(d.payload);
      };
      w.onerror = () => this.disableWorker();
      this.decoder = w;
      w.postMessage({ init: true });
    } catch (e) {
      this.disableWorker();
    }
  }

  private disableWorker() {
    this.usingWorker = false;
    try { this.decoder?.terminate(); } catch (e) {}
    this.decoder = null;
  }

  private syncDecode(data: ArrayBuffer) {
    try {
      const payload = Protocol.decodeServerMessage(new Uint8Array(data));
      if (this.onMessage) this.onMessage(payload);
    } catch (err) {
      console.error('Decoding message error: ', err);
    }
  }

  connect(address: string, onOpen: any, onMessage: any, onClose: any) {
    const endpoint = `${protocol}${address}`;
    this.onMessage = onMessage;

    if (window.socket !== null) {
      window.socket.close();
    }

    this.socket = new WebSocket(endpoint);
    this.socket.binaryType = 'arraybuffer';
    window.socket = this.socket;

    this.socket.addEventListener('open', () => {
      this.onOpen();
      onOpen();
    });
    this.socket.addEventListener('close', (event: CloseEvent) => {
      if(this.debugMode) {
        alert('Connection closed: ' + event.code + ' ' + event.reason);
      }
      onClose(event, endpoint);
      this.close();
    });
    this.socket.addEventListener('message', (message: any) => {
      if (typeof message.data === 'string') return;

      if (this.usingWorker && this.decoder) {
        try {
          this.seq++;
          this.decoder.postMessage({ seq: this.seq, buffer: message.data });
          return;
        } catch (e) {
          this.disableWorker();
        }
      }
      this.syncDecode(message.data);
    });

    return this.socket;
  }

  onOpen() {
    for (const msg of this.queue) {
      this.emit(msg);
    }
  }

  emit(data: any) {
    if (this.socket?.readyState !== 1) {
      return this.queue.push(data);
    }

    const payload = Protocol.encodeClientMessage(data);
    this.socket?.send(payload);
  }

  close() {
    if (this.socket) {
      this.socket.close(1000);
      this.socket = null;
      window.socket = null;
    }
  }
}

export default new Socket();
