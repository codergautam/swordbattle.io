const protobuf = require('protobufjs');

const root = protobuf.loadSync(__dirname + '/schema.proto');
const ServerMessage = root.lookupType('ServerMessage');
const ClientMessage = root.lookupType('ClientMessage');
const makeSendable = (data, depth = 0) => {
  if(depth > 3) return data;
  for (const key in data) {
    const val = data[key];
    if (typeof val === 'number') {
      data[key] = Math.round(val * 100) / 100;
    } else if(val && typeof val === 'object') {
      makeSendable(val, depth + 1);
    }
  }
  return data;
}
const encode = (data) => {
  data = makeSendable(data);
  const message = ServerMessage.create(data);
  return ServerMessage.encode(message).finish();
}
const decode = (msg) => {
  // Validate message size
  if (!msg || msg.byteLength === 0) {
    throw new Error('Empty message');
  }
  if (msg.byteLength > 4096) {
    throw new Error(`Message too large: ${msg.byteLength} bytes`);
  }

  const payload = new Uint8Array(msg);
  const error = ClientMessage.verify(payload);
  if (error) {
    throw new Error(`Verification failed: ${error}`);
  }

  let decoded;
  try {
    decoded = ClientMessage.decode(payload);
    decoded = makeSendable(decoded);
  } catch (e) {
    throw new Error(`Decode failed: ${e.message}`);
  }
  return decoded;
}

module.exports = {
  encode,
  decode,
  ServerMessage,
  ClientMessage,
};
