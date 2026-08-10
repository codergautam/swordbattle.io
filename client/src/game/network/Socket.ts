import * as Protocol from './Protocol';
import { registerIntegrityShutdown, registerIntegrityTarget } from '../integrity';

const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
registerIntegrityTarget(WebSocket.prototype, ['close', 'send']);

const usePooledDecode = true;
const decodeHarness = typeof window !== 'undefined' && window.location.search.includes('decodecheck');

function firstSnapshotDiff(a: any, b: any, path = ''): string | null {
  if (a === b) return null;
  const au = a === undefined || a === null, bu = b === undefined || b === null;
  if (au || bu) return (au && bu) ? null : `${path} (${a} vs ${b})`;
  if (typeof a !== typeof b) return `${path} (type ${typeof a} vs ${typeof b})`;
  if (typeof a !== 'object') return a === b ? null : `${path} (${a} vs ${b})`;
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr || bArr) {
    if (!aArr || !bArr || a.length !== b.length) return `${path} (array shape)`;
    for (let i = 0; i < a.length; i++) { const d = firstSnapshotDiff(a[i], b[i], `${path}[${i}]`); if (d) return d; }
    return null;
  }
  for (const k in a) { const d = firstSnapshotDiff(a[k], b[k], path ? `${path}.${k}` : k); if (d) return d; }
  for (const k in b) { if (!(k in a)) { const d = firstSnapshotDiff(a[k], b[k], path ? `${path}.${k}` : k); if (d) return d; } }
  return null;
}

class Socket {
  private socket: null | WebSocket;
  private queue: any[];
  private debugMode: boolean = false;

  private onMessage: ((payload: any) => void) | null = null;

  constructor() {
    this.socket = null;
    this.queue = [];

    try {
      this.debugMode = window.location.search.includes("debugAlertMode");
      } catch(e) {}
  }

  private syncDecode(data: ArrayBuffer) {
    try {
      const bytes = new Uint8Array(data);
      let payload: any;
      if (usePooledDecode) {
        try {
          payload = Protocol.decodeServerMessagePooled(bytes);
        } catch (e) {
          console.warn('[Socket] pooled decode threw — falling back to generated decoder:', e);
          payload = Protocol.decodeServerMessage(bytes);
        }
        if (decodeHarness) {
          try {
            const oracle = Protocol.decodeServerMessage(bytes);
            const diff = firstSnapshotDiff(oracle, payload);
            if (diff) console.error('[decode-harness] POOLED ≠ GENERATED at:', diff);
          } catch (e) { console.error('[decode-harness] oracle threw:', e); }
        }
      } else {
        payload = Protocol.decodeServerMessage(bytes);
      }
      if (this.onMessage) this.onMessage(payload);
    } catch (err) {
      console.error('Decoding message error: ', err);
    }
  }

  connect(address: string, onOpen: any, onMessage: any, onClose: any) {
    let authSecret = '';
    try { authSecret = window.localStorage.getItem('secret') || ''; } catch (e) {}
    const sep = address.includes('?') ? '&' : '?';
    const endpoint = `${protocol}${address}${authSecret ? `${sep}secret=${encodeURIComponent(authSecret)}` : ''}`;
    this.onMessage = onMessage;

    if (this.socket !== null) {
      this.socket.close();
    }

    this.socket = new WebSocket(endpoint);
    this.socket.binaryType = 'arraybuffer';

    const ws = this.socket;
    const connectTimer = setTimeout(() => {
      if (ws.readyState === 0) {
        console.warn('[Socket] connection timed out:', endpoint);
        try { ws.close(); } catch (e) {}
      }
    }, 12000);

    this.socket.addEventListener('open', () => {
      clearTimeout(connectTimer);
      this.onOpen();
      onOpen();
    });
    this.socket.addEventListener('close', (event: CloseEvent) => {
      clearTimeout(connectTimer);
      // A superseded socket must never tear down the connection that replaced it.
      if (this.socket !== ws) return;
      if(this.debugMode) {
        alert('Connection closed: ' + event.code + ' ' + event.reason);
      }
      onClose(event, endpoint);
      this.close();
    });
    this.socket.addEventListener('message', (message: any) => {
      if (typeof message.data === 'string') return;
      // Drop frames from a socket we've already moved on from — its GameState
      // and display objects may already be destroyed.
      if (this.socket !== ws) return;

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
    // Drop the handler first: it holds the GameState, whose entities may be
    // destroyed moments from now.
    this.onMessage = null;
    if (this.socket) {
      this.socket.close(1000);
      this.socket = null;
    }
  }
}

const socket = new Socket();
registerIntegrityShutdown(() => socket.close());

export default socket;
