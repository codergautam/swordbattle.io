const protobuf = require('protobufjs');

const root = protobuf.loadSync(__dirname + '/schema.proto');
const ServerMessage = root.lookupType('ServerMessage');
const ClientMessage = root.lookupType('ClientMessage');
const makeSendable = (data, depth = 0) => {
  if(depth > 3) return data;
  const keys = Object.keys(data);
  for (const key of keys) {
    if (typeof data[key] === 'number') {
      data[key] = Math.round(data[key] * 100) / 100;
    }
    if(typeof data[key] === 'object') {
      if(!data[key] || !key) continue;
      data[key] = makeSendable(data[key], depth + 1);
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
  const payload = new Uint8Array(msg);
  const error = ClientMessage.verify(payload);
  if (error) {
    console.log('[Protocol] Decoding error: ', error);
    return null;
  };
let decoded;
  try {
  decoded = ClientMessage.decode(payload);
    decoded = makeSendable(decoded);
  } catch (e) {
    console.log('[Protocol] Decoding error: ', e);
    return null;
  }
  return decoded;
}

module.exports = {
  encode,
  decode,
  ServerMessage,
  ClientMessage,
};
