export interface ClientMessage {
  spectate?: boolean;
  play?: boolean;
  angle?: number;
  inputs?: InputData[];
  mouse?: MouseData;
  selectedEvolution?: number;
  selectedBuff?: number;
  chatMessage?: string;
  isPing?: boolean;
  token?: string;
  name?: string;
  captchaP0?: string;
  captchaP1?: string;
  captchaP2?: string;
  captchaP3?: string;
  captchaP4?: string;
}

export function encodeClientMessage(message: ClientMessage): Uint8Array {
  let bb = popByteBuffer();
  _encodeClientMessage(message, bb);
  return toUint8Array(bb);
}

function _encodeClientMessage(message: ClientMessage, bb: ByteBuffer): void {
  // optional bool spectate = 1;
  let $spectate = message.spectate;
  if ($spectate !== undefined) {
    writeVarint32(bb, 8);
    writeByte(bb, $spectate ? 1 : 0);
  }

  // optional bool play = 2;
  let $play = message.play;
  if ($play !== undefined) {
    writeVarint32(bb, 16);
    writeByte(bb, $play ? 1 : 0);
  }

  // optional float angle = 3;
  let $angle = message.angle;
  if ($angle !== undefined) {
    writeVarint32(bb, 29);
    writeFloat(bb, $angle);
  }

  // repeated InputData inputs = 4;
  let array$inputs = message.inputs;
  if (array$inputs !== undefined) {
    for (let value of array$inputs) {
      writeVarint32(bb, 34);
      let nested = popByteBuffer();
      _encodeInputData(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional MouseData mouse = 5;
  let $mouse = message.mouse;
  if ($mouse !== undefined) {
    writeVarint32(bb, 42);
    let nested = popByteBuffer();
    _encodeMouseData($mouse, nested);
    writeVarint32(bb, nested.limit);
    writeByteBuffer(bb, nested);
    pushByteBuffer(nested);
  }

  // optional int32 selectedEvolution = 6;
  let $selectedEvolution = message.selectedEvolution;
  if ($selectedEvolution !== undefined) {
    writeVarint32(bb, 48);
    writeVarint64(bb, intToLong($selectedEvolution));
  }

  // optional int32 selectedBuff = 7;
  let $selectedBuff = message.selectedBuff;
  if ($selectedBuff !== undefined) {
    writeVarint32(bb, 56);
    writeVarint64(bb, intToLong($selectedBuff));
  }

  // optional string chatMessage = 8;
  let $chatMessage = message.chatMessage;
  if ($chatMessage !== undefined) {
    writeVarint32(bb, 66);
    writeString(bb, $chatMessage);
  }

  // optional bool isPing = 9;
  let $isPing = message.isPing;
  if ($isPing !== undefined) {
    writeVarint32(bb, 72);
    writeByte(bb, $isPing ? 1 : 0);
  }

  // optional string token = 10;
  let $token = message.token;
  if ($token !== undefined) {
    writeVarint32(bb, 82);
    writeString(bb, $token);
  }

  // optional string name = 11;
  let $name = message.name;
  if ($name !== undefined) {
    writeVarint32(bb, 90);
    writeString(bb, $name);
  }

  // optional string captchaP0 = 12;
  let $captchaP0 = message.captchaP0;
  if ($captchaP0 !== undefined) {
    writeVarint32(bb, 98);
    writeString(bb, $captchaP0);
  }

  // optional string captchaP1 = 13;
  let $captchaP1 = message.captchaP1;
  if ($captchaP1 !== undefined) {
    writeVarint32(bb, 106);
    writeString(bb, $captchaP1);
  }

  // optional string captchaP2 = 14;
  let $captchaP2 = message.captchaP2;
  if ($captchaP2 !== undefined) {
    writeVarint32(bb, 114);
    writeString(bb, $captchaP2);
  }

  // optional string captchaP3 = 15;
  let $captchaP3 = message.captchaP3;
  if ($captchaP3 !== undefined) {
    writeVarint32(bb, 122);
    writeString(bb, $captchaP3);
  }

  // optional string captchaP4 = 16;
  let $captchaP4 = message.captchaP4;
  if ($captchaP4 !== undefined) {
    writeVarint32(bb, 130);
    writeString(bb, $captchaP4);
  }
}

export function decodeClientMessage(binary: Uint8Array): ClientMessage {
  return _decodeClientMessage(wrapByteBuffer(binary));
}

function _decodeClientMessage(bb: ByteBuffer): ClientMessage {
  let message: ClientMessage = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional bool spectate = 1;
      case 1: {
        message.spectate = !!readByte(bb);
        break;
      }

      // optional bool play = 2;
      case 2: {
        message.play = !!readByte(bb);
        break;
      }

      // optional float angle = 3;
      case 3: {
        message.angle = readFloat(bb);
        break;
      }

      // repeated InputData inputs = 4;
      case 4: {
        let limit = pushTemporaryLength(bb);
        let values = message.inputs || (message.inputs = []);
        values.push(_decodeInputData(bb));
        bb.limit = limit;
        break;
      }

      // optional MouseData mouse = 5;
      case 5: {
        let limit = pushTemporaryLength(bb);
        message.mouse = _decodeMouseData(bb);
        bb.limit = limit;
        break;
      }

      // optional int32 selectedEvolution = 6;
      case 6: {
        message.selectedEvolution = readVarint32(bb);
        break;
      }

      // optional int32 selectedBuff = 7;
      case 7: {
        message.selectedBuff = readVarint32(bb);
        break;
      }

      // optional string chatMessage = 8;
      case 8: {
        message.chatMessage = readString(bb, readVarint32(bb));
        break;
      }

      // optional bool isPing = 9;
      case 9: {
        message.isPing = !!readByte(bb);
        break;
      }

      // optional string token = 10;
      case 10: {
        message.token = readString(bb, readVarint32(bb));
        break;
      }

      // optional string name = 11;
      case 11: {
        message.name = readString(bb, readVarint32(bb));
        break;
      }

      // optional string captchaP0 = 12;
      case 12: {
        message.captchaP0 = readString(bb, readVarint32(bb));
        break;
      }

      // optional string captchaP1 = 13;
      case 13: {
        message.captchaP1 = readString(bb, readVarint32(bb));
        break;
      }

      // optional string captchaP2 = 14;
      case 14: {
        message.captchaP2 = readString(bb, readVarint32(bb));
        break;
      }

      // optional string captchaP3 = 15;
      case 15: {
        message.captchaP3 = readString(bb, readVarint32(bb));
        break;
      }

      // optional string captchaP4 = 16;
      case 16: {
        message.captchaP4 = readString(bb, readVarint32(bb));
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface InputData {
  inputType?: number;
  inputDown?: boolean;
}

export function encodeInputData(message: InputData): Uint8Array {
  let bb = popByteBuffer();
  _encodeInputData(message, bb);
  return toUint8Array(bb);
}

function _encodeInputData(message: InputData, bb: ByteBuffer): void {
  // optional int32 inputType = 1;
  let $inputType = message.inputType;
  if ($inputType !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($inputType));
  }

  // optional bool inputDown = 2;
  let $inputDown = message.inputDown;
  if ($inputDown !== undefined) {
    writeVarint32(bb, 16);
    writeByte(bb, $inputDown ? 1 : 0);
  }
}

export function decodeInputData(binary: Uint8Array): InputData {
  return _decodeInputData(wrapByteBuffer(binary));
}

function _decodeInputData(bb: ByteBuffer): InputData {
  let message: InputData = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 inputType = 1;
      case 1: {
        message.inputType = readVarint32(bb);
        break;
      }

      // optional bool inputDown = 2;
      case 2: {
        message.inputDown = !!readByte(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface MouseData {
  angle?: number;
  force?: number;
}

export function encodeMouseData(message: MouseData): Uint8Array {
  let bb = popByteBuffer();
  _encodeMouseData(message, bb);
  return toUint8Array(bb);
}

function _encodeMouseData(message: MouseData, bb: ByteBuffer): void {
  // optional float angle = 1;
  let $angle = message.angle;
  if ($angle !== undefined) {
    writeVarint32(bb, 13);
    writeFloat(bb, $angle);
  }

  // optional int32 force = 2;
  let $force = message.force;
  if ($force !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($force));
  }
}

export function decodeMouseData(binary: Uint8Array): MouseData {
  return _decodeMouseData(wrapByteBuffer(binary));
}

function _decodeMouseData(bb: ByteBuffer): MouseData {
  let message: MouseData = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional float angle = 1;
      case 1: {
        message.angle = readFloat(bb);
        break;
      }

      // optional int32 force = 2;
      case 2: {
        message.force = readVarint32(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface ServerMessage {
  fullSync?: boolean;
  selfId?: number;
  spectator?: Point;
  mapData?: MapData;
  entities?: { [key: number]: Entity };
  globalEntities?: { [key: number]: Entity };
  isPong?: boolean;
  tps?: number;
}

export function encodeServerMessage(message: ServerMessage): Uint8Array {
  let bb = popByteBuffer();
  _encodeServerMessage(message, bb);
  return toUint8Array(bb);
}

function _encodeServerMessage(message: ServerMessage, bb: ByteBuffer): void {
  // optional bool fullSync = 1;
  let $fullSync = message.fullSync;
  if ($fullSync !== undefined) {
    writeVarint32(bb, 8);
    writeByte(bb, $fullSync ? 1 : 0);
  }

  // optional int32 selfId = 2;
  let $selfId = message.selfId;
  if ($selfId !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($selfId));
  }

  // optional Point spectator = 3;
  let $spectator = message.spectator;
  if ($spectator !== undefined) {
    writeVarint32(bb, 26);
    let nested = popByteBuffer();
    _encodePoint($spectator, nested);
    writeVarint32(bb, nested.limit);
    writeByteBuffer(bb, nested);
    pushByteBuffer(nested);
  }

  // optional MapData mapData = 4;
  let $mapData = message.mapData;
  if ($mapData !== undefined) {
    writeVarint32(bb, 34);
    let nested = popByteBuffer();
    _encodeMapData($mapData, nested);
    writeVarint32(bb, nested.limit);
    writeByteBuffer(bb, nested);
    pushByteBuffer(nested);
  }

  // optional map<int32, Entity> entities = 5;
  let map$entities = message.entities;
  if (map$entities !== undefined) {
    for (let key in map$entities) {
      let nested = popByteBuffer();
      let value = map$entities[key];
      writeVarint32(nested, 8);
      writeVarint64(nested, intToLong(+key));
      writeVarint32(nested, 18);
      let nestedValue = popByteBuffer();
      _encodeEntity(value, nestedValue);
      writeVarint32(nested, nestedValue.limit);
      writeByteBuffer(nested, nestedValue);
      pushByteBuffer(nestedValue);
      writeVarint32(bb, 42);
      writeVarint32(bb, nested.offset);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional map<int32, Entity> globalEntities = 6;
  let map$globalEntities = message.globalEntities;
  if (map$globalEntities !== undefined) {
    for (let key in map$globalEntities) {
      let nested = popByteBuffer();
      let value = map$globalEntities[key];
      writeVarint32(nested, 8);
      writeVarint64(nested, intToLong(+key));
      writeVarint32(nested, 18);
      let nestedValue = popByteBuffer();
      _encodeEntity(value, nestedValue);
      writeVarint32(nested, nestedValue.limit);
      writeByteBuffer(nested, nestedValue);
      pushByteBuffer(nestedValue);
      writeVarint32(bb, 50);
      writeVarint32(bb, nested.offset);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional bool isPong = 7;
  let $isPong = message.isPong;
  if ($isPong !== undefined) {
    writeVarint32(bb, 56);
    writeByte(bb, $isPong ? 1 : 0);
  }

  // optional int32 tps = 8;
  let $tps = message.tps;
  if ($tps !== undefined) {
    writeVarint32(bb, 64);
    writeVarint64(bb, intToLong($tps));
  }
}

export function decodeServerMessage(binary: Uint8Array): ServerMessage {
  return _decodeServerMessage(wrapByteBuffer(binary));
}

function _decodeServerMessage(bb: ByteBuffer): ServerMessage {
  let message: ServerMessage = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional bool fullSync = 1;
      case 1: {
        message.fullSync = !!readByte(bb);
        break;
      }

      // optional int32 selfId = 2;
      case 2: {
        message.selfId = readVarint32(bb);
        break;
      }

      // optional Point spectator = 3;
      case 3: {
        let limit = pushTemporaryLength(bb);
        message.spectator = _decodePoint(bb);
        bb.limit = limit;
        break;
      }

      // optional MapData mapData = 4;
      case 4: {
        let limit = pushTemporaryLength(bb);
        message.mapData = _decodeMapData(bb);
        bb.limit = limit;
        break;
      }

      // optional map<int32, Entity> entities = 5;
      case 5: {
        let values = message.entities || (message.entities = {});
        let outerLimit = pushTemporaryLength(bb);
        let key: number | undefined;
        let value: Entity | undefined;
        end_of_entry: while (!isAtEnd(bb)) {
          let tag = readVarint32(bb);
          switch (tag >>> 3) {
            case 0:
              break end_of_entry;
            case 1: {
              key = readVarint32(bb);
              break;
            }
            case 2: {
              let valueLimit = pushTemporaryLength(bb);
              value = _decodeEntity(bb);
              bb.limit = valueLimit;
              break;
            }
            default:
              skipUnknownField(bb, tag & 7);
          }
        }
        if (key === undefined || value === undefined)
          throw new Error("Invalid data for map: entities");
        values[key] = value;
        bb.limit = outerLimit;
        break;
      }

      // optional map<int32, Entity> globalEntities = 6;
      case 6: {
        let values = message.globalEntities || (message.globalEntities = {});
        let outerLimit = pushTemporaryLength(bb);
        let key: number | undefined;
        let value: Entity | undefined;
        end_of_entry: while (!isAtEnd(bb)) {
          let tag = readVarint32(bb);
          switch (tag >>> 3) {
            case 0:
              break end_of_entry;
            case 1: {
              key = readVarint32(bb);
              break;
            }
            case 2: {
              let valueLimit = pushTemporaryLength(bb);
              value = _decodeEntity(bb);
              bb.limit = valueLimit;
              break;
            }
            default:
              skipUnknownField(bb, tag & 7);
          }
        }
        if (key === undefined || value === undefined)
          throw new Error("Invalid data for map: globalEntities");
        values[key] = value;
        bb.limit = outerLimit;
        break;
      }

      // optional bool isPong = 7;
      case 7: {
        message.isPong = !!readByte(bb);
        break;
      }

      // optional int32 tps = 8;
      case 8: {
        message.tps = readVarint32(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Shape {
  type?: number;
  x?: number;
  y?: number;
  angle?: number;
  radius?: number;
  points?: Point[];
}

export function encodeShape(message: Shape): Uint8Array {
  let bb = popByteBuffer();
  _encodeShape(message, bb);
  return toUint8Array(bb);
}

function _encodeShape(message: Shape, bb: ByteBuffer): void {
  // optional int32 type = 1;
  let $type = message.type;
  if ($type !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($type));
  }

  // optional float x = 2;
  let $x = message.x;
  if ($x !== undefined) {
    writeVarint32(bb, 21);
    writeFloat(bb, $x);
  }

  // optional float y = 3;
  let $y = message.y;
  if ($y !== undefined) {
    writeVarint32(bb, 29);
    writeFloat(bb, $y);
  }

  // optional float angle = 4;
  let $angle = message.angle;
  if ($angle !== undefined) {
    writeVarint32(bb, 37);
    writeFloat(bb, $angle);
  }

  // optional int32 radius = 5;
  let $radius = message.radius;
  if ($radius !== undefined) {
    writeVarint32(bb, 40);
    writeVarint64(bb, intToLong($radius));
  }

  // repeated Point points = 6;
  let array$points = message.points;
  if (array$points !== undefined) {
    for (let value of array$points) {
      writeVarint32(bb, 50);
      let nested = popByteBuffer();
      _encodePoint(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }
}

export function decodeShape(binary: Uint8Array): Shape {
  return _decodeShape(wrapByteBuffer(binary));
}

function _decodeShape(bb: ByteBuffer): Shape {
  let message: Shape = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 type = 1;
      case 1: {
        message.type = readVarint32(bb);
        break;
      }

      // optional float x = 2;
      case 2: {
        message.x = readFloat(bb);
        break;
      }

      // optional float y = 3;
      case 3: {
        message.y = readFloat(bb);
        break;
      }

      // optional float angle = 4;
      case 4: {
        message.angle = readFloat(bb);
        break;
      }

      // optional int32 radius = 5;
      case 5: {
        message.radius = readVarint32(bb);
        break;
      }

      // repeated Point points = 6;
      case 6: {
        let limit = pushTemporaryLength(bb);
        let values = message.points || (message.points = []);
        values.push(_decodePoint(bb));
        bb.limit = limit;
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Point {
  x?: number;
  y?: number;
}

export function encodePoint(message: Point): Uint8Array {
  let bb = popByteBuffer();
  _encodePoint(message, bb);
  return toUint8Array(bb);
}

function _encodePoint(message: Point, bb: ByteBuffer): void {
  // optional int32 x = 1;
  let $x = message.x;
  if ($x !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($x));
  }

  // optional int32 y = 2;
  let $y = message.y;
  if ($y !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($y));
  }
}

export function decodePoint(binary: Uint8Array): Point {
  return _decodePoint(wrapByteBuffer(binary));
}

function _decodePoint(bb: ByteBuffer): Point {
  let message: Point = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 x = 1;
      case 1: {
        message.x = readVarint32(bb);
        break;
      }

      // optional int32 y = 2;
      case 2: {
        message.y = readVarint32(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Buff {
  level?: number;
  max?: number;
  step?: number;
}

export function encodeBuff(message: Buff): Uint8Array {
  let bb = popByteBuffer();
  _encodeBuff(message, bb);
  return toUint8Array(bb);
}

function _encodeBuff(message: Buff, bb: ByteBuffer): void {
  // optional int32 level = 1;
  let $level = message.level;
  if ($level !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($level));
  }

  // optional int32 max = 2;
  let $max = message.max;
  if ($max !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($max));
  }

  // optional float step = 3;
  let $step = message.step;
  if ($step !== undefined) {
    writeVarint32(bb, 29);
    writeFloat(bb, $step);
  }
}

export function decodeBuff(binary: Uint8Array): Buff {
  return _decodeBuff(wrapByteBuffer(binary));
}

function _decodeBuff(bb: ByteBuffer): Buff {
  let message: Buff = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 level = 1;
      case 1: {
        message.level = readVarint32(bb);
        break;
      }

      // optional int32 max = 2;
      case 2: {
        message.max = readVarint32(bb);
        break;
      }

      // optional float step = 3;
      case 3: {
        message.step = readFloat(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Account {
  id?: number;
  created_at?: string;
  subscription?: boolean;
  subscription_start_date?: string;
  rank?: number;
}

export function encodeAccount(message: Account): Uint8Array {
  let bb = popByteBuffer();
  _encodeAccount(message, bb);
  return toUint8Array(bb);
}

function _encodeAccount(message: Account, bb: ByteBuffer): void {
  // optional int32 id = 1;
  let $id = message.id;
  if ($id !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($id));
  }

  // optional string created_at = 2;
  let $created_at = message.created_at;
  if ($created_at !== undefined) {
    writeVarint32(bb, 18);
    writeString(bb, $created_at);
  }

  // optional bool subscription = 3;
  let $subscription = message.subscription;
  if ($subscription !== undefined) {
    writeVarint32(bb, 24);
    writeByte(bb, $subscription ? 1 : 0);
  }

  // optional string subscription_start_date = 4;
  let $subscription_start_date = message.subscription_start_date;
  if ($subscription_start_date !== undefined) {
    writeVarint32(bb, 34);
    writeString(bb, $subscription_start_date);
  }

  // optional int32 rank = 5;
  let $rank = message.rank;
  if ($rank !== undefined) {
    writeVarint32(bb, 40);
    writeVarint64(bb, intToLong($rank));
  }
}

export function decodeAccount(binary: Uint8Array): Account {
  return _decodeAccount(wrapByteBuffer(binary));
}

function _decodeAccount(bb: ByteBuffer): Account {
  let message: Account = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 id = 1;
      case 1: {
        message.id = readVarint32(bb);
        break;
      }

      // optional string created_at = 2;
      case 2: {
        message.created_at = readString(bb, readVarint32(bb));
        break;
      }

      // optional bool subscription = 3;
      case 3: {
        message.subscription = !!readByte(bb);
        break;
      }

      // optional string subscription_start_date = 4;
      case 4: {
        message.subscription_start_date = readString(bb, readVarint32(bb));
        break;
      }

      // optional int32 rank = 5;
      case 5: {
        message.rank = readVarint32(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface MapData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  biomes?: Entity[];
  staticObjects?: Entity[];
}

export function encodeMapData(message: MapData): Uint8Array {
  let bb = popByteBuffer();
  _encodeMapData(message, bb);
  return toUint8Array(bb);
}

function _encodeMapData(message: MapData, bb: ByteBuffer): void {
  // optional int32 x = 1;
  let $x = message.x;
  if ($x !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($x));
  }

  // optional int32 y = 2;
  let $y = message.y;
  if ($y !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($y));
  }

  // optional int32 width = 3;
  let $width = message.width;
  if ($width !== undefined) {
    writeVarint32(bb, 24);
    writeVarint64(bb, intToLong($width));
  }

  // optional int32 height = 4;
  let $height = message.height;
  if ($height !== undefined) {
    writeVarint32(bb, 32);
    writeVarint64(bb, intToLong($height));
  }

  // repeated Entity biomes = 5;
  let array$biomes = message.biomes;
  if (array$biomes !== undefined) {
    for (let value of array$biomes) {
      writeVarint32(bb, 42);
      let nested = popByteBuffer();
      _encodeEntity(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // repeated Entity staticObjects = 6;
  let array$staticObjects = message.staticObjects;
  if (array$staticObjects !== undefined) {
    for (let value of array$staticObjects) {
      writeVarint32(bb, 50);
      let nested = popByteBuffer();
      _encodeEntity(value, nested);
      writeVarint32(bb, nested.limit);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }
}

export function decodeMapData(binary: Uint8Array): MapData {
  return _decodeMapData(wrapByteBuffer(binary));
}

function _decodeMapData(bb: ByteBuffer): MapData {
  let message: MapData = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 x = 1;
      case 1: {
        message.x = readVarint32(bb);
        break;
      }

      // optional int32 y = 2;
      case 2: {
        message.y = readVarint32(bb);
        break;
      }

      // optional int32 width = 3;
      case 3: {
        message.width = readVarint32(bb);
        break;
      }

      // optional int32 height = 4;
      case 4: {
        message.height = readVarint32(bb);
        break;
      }

      // repeated Entity biomes = 5;
      case 5: {
        let limit = pushTemporaryLength(bb);
        let values = message.biomes || (message.biomes = []);
        values.push(_decodeEntity(bb));
        bb.limit = limit;
        break;
      }

      // repeated Entity staticObjects = 6;
      case 6: {
        let limit = pushTemporaryLength(bb);
        let values = message.staticObjects || (message.staticObjects = []);
        values.push(_decodeEntity(bb));
        bb.limit = limit;
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Entity {
  id?: number;
  type?: number;
  depth?: number;
  removed?: boolean;
  shapeData?: Shape;
  healthPercent?: number;
  angle?: number;
  size?: number;
  isAngry?: boolean;
  name?: string;
  username?: string;
  account?: Account;
  kills?: number;
  flags?: { [key: number]: number };
  biome?: number;
  level?: number;
  coins?: number;
  nextLevelCoins?: number;
  previousLevelCoins?: number;
  upgradePoints?: number;
  buffs?: { [key: number]: Buff };
  evolution?: number;
  possibleEvolutions?: { [key: number]: boolean };
  isAbilityAvailable?: boolean;
  abilityActive?: boolean;
  abilityDuration?: number;
  abilityCooldown?: number;
  viewportZoom?: number;
  chatMessage?: string;
  isFlying?: boolean;
  swordFlying?: boolean;
  swordSwingAngle?: number;
  swordSwingProgress?: number;
  swordSwingDuration?: number;
  swordFlyingCooldown?: number;
  disconnectReasonMessage?: string;
  rarity?: number;
  width?: number;
  height?: number;
  disconnectReasonType?: number;
  skin?: number;
}

export function encodeEntity(message: Entity): Uint8Array {
  let bb = popByteBuffer();
  _encodeEntity(message, bb);
  return toUint8Array(bb);
}

function _encodeEntity(message: Entity, bb: ByteBuffer): void {
  // optional int32 id = 1;
  let $id = message.id;
  if ($id !== undefined) {
    writeVarint32(bb, 8);
    writeVarint64(bb, intToLong($id));
  }

  // optional int32 type = 2;
  let $type = message.type;
  if ($type !== undefined) {
    writeVarint32(bb, 16);
    writeVarint64(bb, intToLong($type));
  }

  // optional int32 depth = 3;
  let $depth = message.depth;
  if ($depth !== undefined) {
    writeVarint32(bb, 24);
    writeVarint64(bb, intToLong($depth));
  }

  // optional bool removed = 4;
  let $removed = message.removed;
  if ($removed !== undefined) {
    writeVarint32(bb, 32);
    writeByte(bb, $removed ? 1 : 0);
  }

  // optional Shape shapeData = 5;
  let $shapeData = message.shapeData;
  if ($shapeData !== undefined) {
    writeVarint32(bb, 42);
    let nested = popByteBuffer();
    _encodeShape($shapeData, nested);
    writeVarint32(bb, nested.limit);
    writeByteBuffer(bb, nested);
    pushByteBuffer(nested);
  }

  // optional float healthPercent = 6;
  let $healthPercent = message.healthPercent;
  if ($healthPercent !== undefined) {
    writeVarint32(bb, 53);
    writeFloat(bb, $healthPercent);
  }

  // optional float angle = 7;
  let $angle = message.angle;
  if ($angle !== undefined) {
    writeVarint32(bb, 61);
    writeFloat(bb, $angle);
  }

  // optional int32 size = 8;
  let $size = message.size;
  if ($size !== undefined) {
    writeVarint32(bb, 64);
    writeVarint64(bb, intToLong($size));
  }

  // optional bool isAngry = 9;
  let $isAngry = message.isAngry;
  if ($isAngry !== undefined) {
    writeVarint32(bb, 72);
    writeByte(bb, $isAngry ? 1 : 0);
  }

  // optional string name = 10;
  let $name = message.name;
  if ($name !== undefined) {
    writeVarint32(bb, 82);
    writeString(bb, $name);
  }

  // optional string username = 11;
  let $username = message.username;
  if ($username !== undefined) {
    writeVarint32(bb, 90);
    writeString(bb, $username);
  }

  // optional Account account = 12;
  let $account = message.account;
  if ($account !== undefined) {
    writeVarint32(bb, 98);
    let nested = popByteBuffer();
    _encodeAccount($account, nested);
    writeVarint32(bb, nested.limit);
    writeByteBuffer(bb, nested);
    pushByteBuffer(nested);
  }

  // optional int32 kills = 13;
  let $kills = message.kills;
  if ($kills !== undefined) {
    writeVarint32(bb, 104);
    writeVarint64(bb, intToLong($kills));
  }

  // optional map<int32, int32> flags = 14;
  let map$flags = message.flags;
  if (map$flags !== undefined) {
    for (let key in map$flags) {
      let nested = popByteBuffer();
      let value = map$flags[key];
      writeVarint32(nested, 8);
      writeVarint64(nested, intToLong(+key));
      writeVarint32(nested, 16);
      writeVarint64(nested, intToLong(value));
      writeVarint32(bb, 114);
      writeVarint32(bb, nested.offset);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional int32 biome = 15;
  let $biome = message.biome;
  if ($biome !== undefined) {
    writeVarint32(bb, 120);
    writeVarint64(bb, intToLong($biome));
  }

  // optional int32 level = 16;
  let $level = message.level;
  if ($level !== undefined) {
    writeVarint32(bb, 128);
    writeVarint64(bb, intToLong($level));
  }

  // optional int32 coins = 17;
  let $coins = message.coins;
  if ($coins !== undefined) {
    writeVarint32(bb, 136);
    writeVarint64(bb, intToLong($coins));
  }

  // optional int32 nextLevelCoins = 18;
  let $nextLevelCoins = message.nextLevelCoins;
  if ($nextLevelCoins !== undefined) {
    writeVarint32(bb, 144);
    writeVarint64(bb, intToLong($nextLevelCoins));
  }

  // optional int32 previousLevelCoins = 19;
  let $previousLevelCoins = message.previousLevelCoins;
  if ($previousLevelCoins !== undefined) {
    writeVarint32(bb, 152);
    writeVarint64(bb, intToLong($previousLevelCoins));
  }

  // optional int32 upgradePoints = 20;
  let $upgradePoints = message.upgradePoints;
  if ($upgradePoints !== undefined) {
    writeVarint32(bb, 160);
    writeVarint64(bb, intToLong($upgradePoints));
  }

  // optional map<int32, Buff> buffs = 21;
  let map$buffs = message.buffs;
  if (map$buffs !== undefined) {
    for (let key in map$buffs) {
      let nested = popByteBuffer();
      let value = map$buffs[key];
      writeVarint32(nested, 8);
      writeVarint64(nested, intToLong(+key));
      writeVarint32(nested, 18);
      let nestedValue = popByteBuffer();
      _encodeBuff(value, nestedValue);
      writeVarint32(nested, nestedValue.limit);
      writeByteBuffer(nested, nestedValue);
      pushByteBuffer(nestedValue);
      writeVarint32(bb, 170);
      writeVarint32(bb, nested.offset);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional int32 evolution = 22;
  let $evolution = message.evolution;
  if ($evolution !== undefined) {
    writeVarint32(bb, 176);
    writeVarint64(bb, intToLong($evolution));
  }

  // optional map<int32, bool> possibleEvolutions = 23;
  let map$possibleEvolutions = message.possibleEvolutions;
  if (map$possibleEvolutions !== undefined) {
    for (let key in map$possibleEvolutions) {
      let nested = popByteBuffer();
      let value = map$possibleEvolutions[key];
      writeVarint32(nested, 8);
      writeVarint64(nested, intToLong(+key));
      writeVarint32(nested, 16);
      writeByte(nested, value ? 1 : 0);
      writeVarint32(bb, 186);
      writeVarint32(bb, nested.offset);
      writeByteBuffer(bb, nested);
      pushByteBuffer(nested);
    }
  }

  // optional bool isAbilityAvailable = 24;
  let $isAbilityAvailable = message.isAbilityAvailable;
  if ($isAbilityAvailable !== undefined) {
    writeVarint32(bb, 192);
    writeByte(bb, $isAbilityAvailable ? 1 : 0);
  }

  // optional bool abilityActive = 25;
  let $abilityActive = message.abilityActive;
  if ($abilityActive !== undefined) {
    writeVarint32(bb, 200);
    writeByte(bb, $abilityActive ? 1 : 0);
  }

  // optional float abilityDuration = 26;
  let $abilityDuration = message.abilityDuration;
  if ($abilityDuration !== undefined) {
    writeVarint32(bb, 213);
    writeFloat(bb, $abilityDuration);
  }

  // optional float abilityCooldown = 27;
  let $abilityCooldown = message.abilityCooldown;
  if ($abilityCooldown !== undefined) {
    writeVarint32(bb, 221);
    writeFloat(bb, $abilityCooldown);
  }

  // optional float viewportZoom = 28;
  let $viewportZoom = message.viewportZoom;
  if ($viewportZoom !== undefined) {
    writeVarint32(bb, 229);
    writeFloat(bb, $viewportZoom);
  }

  // optional string chatMessage = 29;
  let $chatMessage = message.chatMessage;
  if ($chatMessage !== undefined) {
    writeVarint32(bb, 234);
    writeString(bb, $chatMessage);
  }

  // optional bool isFlying = 30;
  let $isFlying = message.isFlying;
  if ($isFlying !== undefined) {
    writeVarint32(bb, 240);
    writeByte(bb, $isFlying ? 1 : 0);
  }

  // optional bool swordFlying = 31;
  let $swordFlying = message.swordFlying;
  if ($swordFlying !== undefined) {
    writeVarint32(bb, 248);
    writeByte(bb, $swordFlying ? 1 : 0);
  }

  // optional float swordSwingAngle = 32;
  let $swordSwingAngle = message.swordSwingAngle;
  if ($swordSwingAngle !== undefined) {
    writeVarint32(bb, 261);
    writeFloat(bb, $swordSwingAngle);
  }

  // optional float swordSwingProgress = 33;
  let $swordSwingProgress = message.swordSwingProgress;
  if ($swordSwingProgress !== undefined) {
    writeVarint32(bb, 269);
    writeFloat(bb, $swordSwingProgress);
  }

  // optional float swordSwingDuration = 34;
  let $swordSwingDuration = message.swordSwingDuration;
  if ($swordSwingDuration !== undefined) {
    writeVarint32(bb, 277);
    writeFloat(bb, $swordSwingDuration);
  }

  // optional float swordFlyingCooldown = 35;
  let $swordFlyingCooldown = message.swordFlyingCooldown;
  if ($swordFlyingCooldown !== undefined) {
    writeVarint32(bb, 285);
    writeFloat(bb, $swordFlyingCooldown);
  }

  // optional string disconnectReasonMessage = 36;
  let $disconnectReasonMessage = message.disconnectReasonMessage;
  if ($disconnectReasonMessage !== undefined) {
    writeVarint32(bb, 290);
    writeString(bb, $disconnectReasonMessage);
  }

  // optional int32 rarity = 38;
  let $rarity = message.rarity;
  if ($rarity !== undefined) {
    writeVarint32(bb, 304);
    writeVarint64(bb, intToLong($rarity));
  }

  // optional int32 width = 39;
  let $width = message.width;
  if ($width !== undefined) {
    writeVarint32(bb, 312);
    writeVarint64(bb, intToLong($width));
  }

  // optional int32 height = 40;
  let $height = message.height;
  if ($height !== undefined) {
    writeVarint32(bb, 320);
    writeVarint64(bb, intToLong($height));
  }

  // optional int32 disconnectReasonType = 41;
  let $disconnectReasonType = message.disconnectReasonType;
  if ($disconnectReasonType !== undefined) {
    writeVarint32(bb, 328);
    writeVarint64(bb, intToLong($disconnectReasonType));
  }

  // optional int32 skin = 42;
  let $skin = message.skin;
  if ($skin !== undefined) {
    writeVarint32(bb, 336);
    writeVarint64(bb, intToLong($skin));
  }
}

export function decodeEntity(binary: Uint8Array): Entity {
  return _decodeEntity(wrapByteBuffer(binary));
}

function _decodeEntity(bb: ByteBuffer): Entity {
  let message: Entity = {} as any;

  end_of_message: while (!isAtEnd(bb)) {
    let tag = readVarint32(bb);

    switch (tag >>> 3) {
      case 0:
        break end_of_message;

      // optional int32 id = 1;
      case 1: {
        message.id = readVarint32(bb);
        break;
      }

      // optional int32 type = 2;
      case 2: {
        message.type = readVarint32(bb);
        break;
      }

      // optional int32 depth = 3;
      case 3: {
        message.depth = readVarint32(bb);
        break;
      }

      // optional bool removed = 4;
      case 4: {
        message.removed = !!readByte(bb);
        break;
      }

      // optional Shape shapeData = 5;
      case 5: {
        let limit = pushTemporaryLength(bb);
        message.shapeData = _decodeShape(bb);
        bb.limit = limit;
        break;
      }

      // optional float healthPercent = 6;
      case 6: {
        message.healthPercent = readFloat(bb);
        break;
      }

      // optional float angle = 7;
      case 7: {
        message.angle = readFloat(bb);
        break;
      }

      // optional int32 size = 8;
      case 8: {
        message.size = readVarint32(bb);
        break;
      }

      // optional bool isAngry = 9;
      case 9: {
        message.isAngry = !!readByte(bb);
        break;
      }

      // optional string name = 10;
      case 10: {
        message.name = readString(bb, readVarint32(bb));
        break;
      }

      // optional string username = 11;
      case 11: {
        message.username = readString(bb, readVarint32(bb));
        break;
      }

      // optional Account account = 12;
      case 12: {
        let limit = pushTemporaryLength(bb);
        message.account = _decodeAccount(bb);
        bb.limit = limit;
        break;
      }

      // optional int32 kills = 13;
      case 13: {
        message.kills = readVarint32(bb);
        break;
      }

      // optional map<int32, int32> flags = 14;
      case 14: {
        let values = message.flags || (message.flags = {});
        let outerLimit = pushTemporaryLength(bb);
        let key: number | undefined;
        let value: number | undefined;
        end_of_entry: while (!isAtEnd(bb)) {
          let tag = readVarint32(bb);
          switch (tag >>> 3) {
            case 0:
              break end_of_entry;
            case 1: {
              key = readVarint32(bb);
              break;
            }
            case 2: {
              value = readVarint32(bb);
              break;
            }
            default:
              skipUnknownField(bb, tag & 7);
          }
        }
        if (key === undefined || value === undefined)
          throw new Error("Invalid data for map: flags");
        values[key] = value;
        bb.limit = outerLimit;
        break;
      }

      // optional int32 biome = 15;
      case 15: {
        message.biome = readVarint32(bb);
        break;
      }

      // optional int32 level = 16;
      case 16: {
        message.level = readVarint32(bb);
        break;
      }

      // optional int32 coins = 17;
      case 17: {
        message.coins = readVarint32(bb);
        break;
      }

      // optional int32 nextLevelCoins = 18;
      case 18: {
        message.nextLevelCoins = readVarint32(bb);
        break;
      }

      // optional int32 previousLevelCoins = 19;
      case 19: {
        message.previousLevelCoins = readVarint32(bb);
        break;
      }

      // optional int32 upgradePoints = 20;
      case 20: {
        message.upgradePoints = readVarint32(bb);
        break;
      }

      // optional map<int32, Buff> buffs = 21;
      case 21: {
        let values = message.buffs || (message.buffs = {});
        let outerLimit = pushTemporaryLength(bb);
        let key: number | undefined;
        let value: Buff | undefined;
        end_of_entry: while (!isAtEnd(bb)) {
          let tag = readVarint32(bb);
          switch (tag >>> 3) {
            case 0:
              break end_of_entry;
            case 1: {
              key = readVarint32(bb);
              break;
            }
            case 2: {
              let valueLimit = pushTemporaryLength(bb);
              value = _decodeBuff(bb);
              bb.limit = valueLimit;
              break;
            }
            default:
              skipUnknownField(bb, tag & 7);
          }
        }
        if (key === undefined || value === undefined)
          throw new Error("Invalid data for map: buffs");
        values[key] = value;
        bb.limit = outerLimit;
        break;
      }

      // optional int32 evolution = 22;
      case 22: {
        message.evolution = readVarint32(bb);
        break;
      }

      // optional map<int32, bool> possibleEvolutions = 23;
      case 23: {
        let values = message.possibleEvolutions || (message.possibleEvolutions = {});
        let outerLimit = pushTemporaryLength(bb);
        let key: number | undefined;
        let value: boolean | undefined;
        end_of_entry: while (!isAtEnd(bb)) {
          let tag = readVarint32(bb);
          switch (tag >>> 3) {
            case 0:
              break end_of_entry;
            case 1: {
              key = readVarint32(bb);
              break;
            }
            case 2: {
              value = !!readByte(bb);
              break;
            }
            default:
              skipUnknownField(bb, tag & 7);
          }
        }
        if (key === undefined || value === undefined)
          throw new Error("Invalid data for map: possibleEvolutions");
        values[key] = value;
        bb.limit = outerLimit;
        break;
      }

      // optional bool isAbilityAvailable = 24;
      case 24: {
        message.isAbilityAvailable = !!readByte(bb);
        break;
      }

      // optional bool abilityActive = 25;
      case 25: {
        message.abilityActive = !!readByte(bb);
        break;
      }

      // optional float abilityDuration = 26;
      case 26: {
        message.abilityDuration = readFloat(bb);
        break;
      }

      // optional float abilityCooldown = 27;
      case 27: {
        message.abilityCooldown = readFloat(bb);
        break;
      }

      // optional float viewportZoom = 28;
      case 28: {
        message.viewportZoom = readFloat(bb);
        break;
      }

      // optional string chatMessage = 29;
      case 29: {
        message.chatMessage = readString(bb, readVarint32(bb));
        break;
      }

      // optional bool isFlying = 30;
      case 30: {
        message.isFlying = !!readByte(bb);
        break;
      }

      // optional bool swordFlying = 31;
      case 31: {
        message.swordFlying = !!readByte(bb);
        break;
      }

      // optional float swordSwingAngle = 32;
      case 32: {
        message.swordSwingAngle = readFloat(bb);
        break;
      }

      // optional float swordSwingProgress = 33;
      case 33: {
        message.swordSwingProgress = readFloat(bb);
        break;
      }

      // optional float swordSwingDuration = 34;
      case 34: {
        message.swordSwingDuration = readFloat(bb);
        break;
      }

      // optional float swordFlyingCooldown = 35;
      case 35: {
        message.swordFlyingCooldown = readFloat(bb);
        break;
      }

      // optional string disconnectReasonMessage = 36;
      case 36: {
        message.disconnectReasonMessage = readString(bb, readVarint32(bb));
        break;
      }

      // optional int32 rarity = 38;
      case 38: {
        message.rarity = readVarint32(bb);
        break;
      }

      // optional int32 width = 39;
      case 39: {
        message.width = readVarint32(bb);
        break;
      }

      // optional int32 height = 40;
      case 40: {
        message.height = readVarint32(bb);
        break;
      }

      // optional int32 disconnectReasonType = 41;
      case 41: {
        message.disconnectReasonType = readVarint32(bb);
        break;
      }

      // optional int32 skin = 42;
      case 42: {
        message.skin = readVarint32(bb);
        break;
      }

      default:
        skipUnknownField(bb, tag & 7);
    }
  }

  return message;
}

export interface Long {
  low: number;
  high: number;
  unsigned: boolean;
}

interface ByteBuffer {
  bytes: Uint8Array;
  offset: number;
  limit: number;
}

function pushTemporaryLength(bb: ByteBuffer): number {
  let length = readVarint32(bb);
  let limit = bb.limit;
  bb.limit = bb.offset + length;
  return limit;
}

function skipUnknownField(bb: ByteBuffer, type: number): void {
  switch (type) {
    case 0: while (readByte(bb) & 0x80) { } break;
    case 2: skip(bb, readVarint32(bb)); break;
    case 5: skip(bb, 4); break;
    case 1: skip(bb, 8); break;
    default: throw new Error("Unimplemented type: " + type);
  }
}

function stringToLong(value: string): Long {
  return {
    low: value.charCodeAt(0) | (value.charCodeAt(1) << 16),
    high: value.charCodeAt(2) | (value.charCodeAt(3) << 16),
    unsigned: false,
  };
}

function longToString(value: Long): string {
  let low = value.low;
  let high = value.high;
  return String.fromCharCode(
    low & 0xFFFF,
    low >>> 16,
    high & 0xFFFF,
    high >>> 16);
}

// The code below was modified from https://github.com/protobufjs/bytebuffer.js
// which is under the Apache License 2.0.

let f32 = new Float32Array(1);
let f32_u8 = new Uint8Array(f32.buffer);

let f64 = new Float64Array(1);
let f64_u8 = new Uint8Array(f64.buffer);

function intToLong(value: number): Long {
  value |= 0;
  return {
    low: value,
    high: value >> 31,
    unsigned: value >= 0,
  };
}

let bbStack: ByteBuffer[] = [];

function popByteBuffer(): ByteBuffer {
  const bb = bbStack.pop();
  if (!bb) return { bytes: new Uint8Array(64), offset: 0, limit: 0 };
  bb.offset = bb.limit = 0;
  return bb;
}

function pushByteBuffer(bb: ByteBuffer): void {
  bbStack.push(bb);
}

function wrapByteBuffer(bytes: Uint8Array): ByteBuffer {
  return { bytes, offset: 0, limit: bytes.length };
}

function toUint8Array(bb: ByteBuffer): Uint8Array {
  let bytes = bb.bytes;
  let limit = bb.limit;
  return bytes.length === limit ? bytes : bytes.subarray(0, limit);
}

function skip(bb: ByteBuffer, offset: number): void {
  if (bb.offset + offset > bb.limit) {
    throw new Error('Skip past limit');
  }
  bb.offset += offset;
}

function isAtEnd(bb: ByteBuffer): boolean {
  return bb.offset >= bb.limit;
}

function grow(bb: ByteBuffer, count: number): number {
  let bytes = bb.bytes;
  let offset = bb.offset;
  let limit = bb.limit;
  let finalOffset = offset + count;
  if (finalOffset > bytes.length) {
    let newBytes = new Uint8Array(finalOffset * 2);
    newBytes.set(bytes);
    bb.bytes = newBytes;
  }
  bb.offset = finalOffset;
  if (finalOffset > limit) {
    bb.limit = finalOffset;
  }
  return offset;
}

function advance(bb: ByteBuffer, count: number): number {
  let offset = bb.offset;
  if (offset + count > bb.limit) {
    throw new Error('Read past limit');
  }
  bb.offset += count;
  return offset;
}

function readBytes(bb: ByteBuffer, count: number): Uint8Array {
  let offset = advance(bb, count);
  return bb.bytes.subarray(offset, offset + count);
}

function writeBytes(bb: ByteBuffer, buffer: Uint8Array): void {
  let offset = grow(bb, buffer.length);
  bb.bytes.set(buffer, offset);
}

function readString(bb: ByteBuffer, count: number): string {
  // Sadly a hand-coded UTF8 decoder is much faster than subarray+TextDecoder in V8
  let offset = advance(bb, count);
  let fromCharCode = String.fromCharCode;
  let bytes = bb.bytes;
  let invalid = '\uFFFD';
  let text = '';

  for (let i = 0; i < count; i++) {
    let c1 = bytes[i + offset], c2: number, c3: number, c4: number, c: number;

    // 1 byte
    if ((c1 & 0x80) === 0) {
      text += fromCharCode(c1);
    }

    // 2 bytes
    else if ((c1 & 0xE0) === 0xC0) {
      if (i + 1 >= count) text += invalid;
      else {
        c2 = bytes[i + offset + 1];
        if ((c2 & 0xC0) !== 0x80) text += invalid;
        else {
          c = ((c1 & 0x1F) << 6) | (c2 & 0x3F);
          if (c < 0x80) text += invalid;
          else {
            text += fromCharCode(c);
            i++;
          }
        }
      }
    }

    // 3 bytes
    else if ((c1 & 0xF0) == 0xE0) {
      if (i + 2 >= count) text += invalid;
      else {
        c2 = bytes[i + offset + 1];
        c3 = bytes[i + offset + 2];
        if (((c2 | (c3 << 8)) & 0xC0C0) !== 0x8080) text += invalid;
        else {
          c = ((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);
          if (c < 0x0800 || (c >= 0xD800 && c <= 0xDFFF)) text += invalid;
          else {
            text += fromCharCode(c);
            i += 2;
          }
        }
      }
    }

    // 4 bytes
    else if ((c1 & 0xF8) == 0xF0) {
      if (i + 3 >= count) text += invalid;
      else {
        c2 = bytes[i + offset + 1];
        c3 = bytes[i + offset + 2];
        c4 = bytes[i + offset + 3];
        if (((c2 | (c3 << 8) | (c4 << 16)) & 0xC0C0C0) !== 0x808080) text += invalid;
        else {
          c = ((c1 & 0x07) << 0x12) | ((c2 & 0x3F) << 0x0C) | ((c3 & 0x3F) << 0x06) | (c4 & 0x3F);
          if (c < 0x10000 || c > 0x10FFFF) text += invalid;
          else {
            c -= 0x10000;
            text += fromCharCode((c >> 10) + 0xD800, (c & 0x3FF) + 0xDC00);
            i += 3;
          }
        }
      }
    }

    else text += invalid;
  }

  return text;
}

function writeString(bb: ByteBuffer, text: string): void {
  // Sadly a hand-coded UTF8 encoder is much faster than TextEncoder+set in V8
  let n = text.length;
  let byteCount = 0;

  // Write the byte count first
  for (let i = 0; i < n; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
      c = (c << 10) + text.charCodeAt(++i) - 0x35FDC00;
    }
    byteCount += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  writeVarint32(bb, byteCount);

  let offset = grow(bb, byteCount);
  let bytes = bb.bytes;

  // Then write the bytes
  for (let i = 0; i < n; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < n) {
      c = (c << 10) + text.charCodeAt(++i) - 0x35FDC00;
    }
    if (c < 0x80) {
      bytes[offset++] = c;
    } else {
      if (c < 0x800) {
        bytes[offset++] = ((c >> 6) & 0x1F) | 0xC0;
      } else {
        if (c < 0x10000) {
          bytes[offset++] = ((c >> 12) & 0x0F) | 0xE0;
        } else {
          bytes[offset++] = ((c >> 18) & 0x07) | 0xF0;
          bytes[offset++] = ((c >> 12) & 0x3F) | 0x80;
        }
        bytes[offset++] = ((c >> 6) & 0x3F) | 0x80;
      }
      bytes[offset++] = (c & 0x3F) | 0x80;
    }
  }
}

function writeByteBuffer(bb: ByteBuffer, buffer: ByteBuffer): void {
  let offset = grow(bb, buffer.limit);
  let from = bb.bytes;
  let to = buffer.bytes;

  // This for loop is much faster than subarray+set on V8
  for (let i = 0, n = buffer.limit; i < n; i++) {
    from[i + offset] = to[i];
  }
}

function readByte(bb: ByteBuffer): number {
  return bb.bytes[advance(bb, 1)];
}

function writeByte(bb: ByteBuffer, value: number): void {
  let offset = grow(bb, 1);
  bb.bytes[offset] = value;
}

function readFloat(bb: ByteBuffer): number {
  let offset = advance(bb, 4);
  let bytes = bb.bytes;

  // Manual copying is much faster than subarray+set in V8
  f32_u8[0] = bytes[offset++];
  f32_u8[1] = bytes[offset++];
  f32_u8[2] = bytes[offset++];
  f32_u8[3] = bytes[offset++];
  return f32[0];
}

function writeFloat(bb: ByteBuffer, value: number): void {
  let offset = grow(bb, 4);
  let bytes = bb.bytes;
  f32[0] = value;

  // Manual copying is much faster than subarray+set in V8
  bytes[offset++] = f32_u8[0];
  bytes[offset++] = f32_u8[1];
  bytes[offset++] = f32_u8[2];
  bytes[offset++] = f32_u8[3];
}

function readDouble(bb: ByteBuffer): number {
  let offset = advance(bb, 8);
  let bytes = bb.bytes;

  // Manual copying is much faster than subarray+set in V8
  f64_u8[0] = bytes[offset++];
  f64_u8[1] = bytes[offset++];
  f64_u8[2] = bytes[offset++];
  f64_u8[3] = bytes[offset++];
  f64_u8[4] = bytes[offset++];
  f64_u8[5] = bytes[offset++];
  f64_u8[6] = bytes[offset++];
  f64_u8[7] = bytes[offset++];
  return f64[0];
}

function writeDouble(bb: ByteBuffer, value: number): void {
  let offset = grow(bb, 8);
  let bytes = bb.bytes;
  f64[0] = value;

  // Manual copying is much faster than subarray+set in V8
  bytes[offset++] = f64_u8[0];
  bytes[offset++] = f64_u8[1];
  bytes[offset++] = f64_u8[2];
  bytes[offset++] = f64_u8[3];
  bytes[offset++] = f64_u8[4];
  bytes[offset++] = f64_u8[5];
  bytes[offset++] = f64_u8[6];
  bytes[offset++] = f64_u8[7];
}

function readInt32(bb: ByteBuffer): number {
  let offset = advance(bb, 4);
  let bytes = bb.bytes;
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  );
}

function writeInt32(bb: ByteBuffer, value: number): void {
  let offset = grow(bb, 4);
  let bytes = bb.bytes;
  bytes[offset] = value;
  bytes[offset + 1] = value >> 8;
  bytes[offset + 2] = value >> 16;
  bytes[offset + 3] = value >> 24;
}

function readInt64(bb: ByteBuffer, unsigned: boolean): Long {
  return {
    low: readInt32(bb),
    high: readInt32(bb),
    unsigned,
  };
}

function writeInt64(bb: ByteBuffer, value: Long): void {
  writeInt32(bb, value.low);
  writeInt32(bb, value.high);
}

function readVarint32(bb: ByteBuffer): number {
  let c = 0;
  let value = 0;
  let b: number;
  do {
    b = readByte(bb);
    if (c < 32) value |= (b & 0x7F) << c;
    c += 7;
  } while (b & 0x80);
  return value;
}

function writeVarint32(bb: ByteBuffer, value: number): void {
  value >>>= 0;
  while (value >= 0x80) {
    writeByte(bb, (value & 0x7f) | 0x80);
    value >>>= 7;
  }
  writeByte(bb, value);
}

function readVarint64(bb: ByteBuffer, unsigned: boolean): Long {
  let part0 = 0;
  let part1 = 0;
  let part2 = 0;
  let b: number;

  b = readByte(bb); part0 = (b & 0x7F); if (b & 0x80) {
    b = readByte(bb); part0 |= (b & 0x7F) << 7; if (b & 0x80) {
      b = readByte(bb); part0 |= (b & 0x7F) << 14; if (b & 0x80) {
        b = readByte(bb); part0 |= (b & 0x7F) << 21; if (b & 0x80) {

          b = readByte(bb); part1 = (b & 0x7F); if (b & 0x80) {
            b = readByte(bb); part1 |= (b & 0x7F) << 7; if (b & 0x80) {
              b = readByte(bb); part1 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = readByte(bb); part1 |= (b & 0x7F) << 21; if (b & 0x80) {

                  b = readByte(bb); part2 = (b & 0x7F); if (b & 0x80) {
                    b = readByte(bb); part2 |= (b & 0x7F) << 7;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return {
    low: part0 | (part1 << 28),
    high: (part1 >>> 4) | (part2 << 24),
    unsigned,
  };
}

function writeVarint64(bb: ByteBuffer, value: Long): void {
  let part0 = value.low >>> 0;
  let part1 = ((value.low >>> 28) | (value.high << 4)) >>> 0;
  let part2 = value.high >>> 24;

  // ref: src/google/protobuf/io/coded_stream.cc
  let size =
    part2 === 0 ?
      part1 === 0 ?
        part0 < 1 << 14 ?
          part0 < 1 << 7 ? 1 : 2 :
          part0 < 1 << 21 ? 3 : 4 :
        part1 < 1 << 14 ?
          part1 < 1 << 7 ? 5 : 6 :
          part1 < 1 << 21 ? 7 : 8 :
      part2 < 1 << 7 ? 9 : 10;

  let offset = grow(bb, size);
  let bytes = bb.bytes;

  switch (size) {
    case 10: bytes[offset + 9] = (part2 >>> 7) & 0x01;
    case 9: bytes[offset + 8] = size !== 9 ? part2 | 0x80 : part2 & 0x7F;
    case 8: bytes[offset + 7] = size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F;
    case 7: bytes[offset + 6] = size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F;
    case 6: bytes[offset + 5] = size !== 6 ? (part1 >>> 7) | 0x80 : (part1 >>> 7) & 0x7F;
    case 5: bytes[offset + 4] = size !== 5 ? part1 | 0x80 : part1 & 0x7F;
    case 4: bytes[offset + 3] = size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F;
    case 3: bytes[offset + 2] = size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F;
    case 2: bytes[offset + 1] = size !== 2 ? (part0 >>> 7) | 0x80 : (part0 >>> 7) & 0x7F;
    case 1: bytes[offset] = size !== 1 ? part0 | 0x80 : part0 & 0x7F;
  }
}

function readVarint32ZigZag(bb: ByteBuffer): number {
  let value = readVarint32(bb);

  // ref: src/google/protobuf/wire_format_lite.h
  return (value >>> 1) ^ -(value & 1);
}

function writeVarint32ZigZag(bb: ByteBuffer, value: number): void {
  // ref: src/google/protobuf/wire_format_lite.h
  writeVarint32(bb, (value << 1) ^ (value >> 31));
}

function readVarint64ZigZag(bb: ByteBuffer): Long {
  let value = readVarint64(bb, /* unsigned */ false);
  let low = value.low;
  let high = value.high;
  let flip = -(low & 1);

  // ref: src/google/protobuf/wire_format_lite.h
  return {
    low: ((low >>> 1) | (high << 31)) ^ flip,
    high: (high >>> 1) ^ flip,
    unsigned: false,
  };
}

function writeVarint64ZigZag(bb: ByteBuffer, value: Long): void {
  let low = value.low;
  let high = value.high;
  let flip = high >> 31;

  // ref: src/google/protobuf/wire_format_lite.h
  writeVarint64(bb, {
    low: (low << 1) ^ flip,
    high: ((high << 1) | (low >>> 31)) ^ flip,
    unsigned: false,
  });
}
