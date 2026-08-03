/* eslint-disable no-restricted-globals */
import { decodeServerMessage } from './Protocol';

const ctx: any = self;

ctx.onmessage = (e: MessageEvent) => {
  const data = e.data || {};
  if (data.init) {
    ctx.postMessage({ ready: true });
    return;
  }
  const seq = data.seq;
  try {
    const payload = decodeServerMessage(new Uint8Array(data.buffer));
    ctx.postMessage({ seq, payload });
  } catch (err: any) {
    ctx.postMessage({ seq, error: String((err && err.message) || err) });
  }
};
