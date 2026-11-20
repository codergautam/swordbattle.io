export interface Vector2 {
  x: number;
  y: number;
}

export interface ClientMessage {
  type: number;
  data?: Uint8Array | Record<string, unknown>;
}

export interface ServerMessage {
  type: number;
  data?: Uint8Array | Record<string, unknown>;
}

export const schemaPath: string;
