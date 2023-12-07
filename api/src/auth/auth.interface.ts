export interface JwtPayload {
  sub: number;
  iat: number;
  exp: number;
}

export interface ServerPayload {
  isServer: boolean;
}
