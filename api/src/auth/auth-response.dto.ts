import { Expose } from 'class-transformer';

export class AuthResponseDTO {
  @Expose()
  account: any;

  @Expose()
  secret: string;

  constructor(account: any, secret: string) {
    this.account = account;
    this.secret = secret;
  }
}
