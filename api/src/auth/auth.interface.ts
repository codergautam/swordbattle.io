export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export interface ServerPayload {
  isServer: boolean;
}
