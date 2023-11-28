const protobuf = require('protobufjs');

const root = protobuf.loadSync(__dirname + '/schema.proto');
const ServerMessage = root.lookupType('ServerMessage');
const ClientMessage = root.lookupType('ClientMessage');

const encode = (data) => {
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
