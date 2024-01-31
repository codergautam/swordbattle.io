import * as Protocol from './Protocol';

const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
window.socket = null;

class Socket {
  private socket: null | WebSocket;
  private queue: any[];
  private debugMode: boolean;

  constructor() {
    this.socket = null;
    this.queue = [];

    try {
      this.debugMode = window.location.search.includes("debugAlertMode");
      } catch(e) {}
  }

  connect(address: string, onOpen: any, onMessage: any, onClose: any) {
    const endpoint = `${protocol}${address}`;

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

      try {
        const payload = Protocol.decodeServerMessage(new Uint8Array(message.data));
        onMessage(payload);
      } catch (err) {
        console.error('Decoding message error: ', err);
        // alert("Your game has crashed. Please refresh the page. If this issue persists, please contact support. Error: " + err)
      }
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
