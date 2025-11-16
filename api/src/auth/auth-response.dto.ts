export class AuthResponseDTO {
  account: any;
  secret: string;

  constructor(account: any, secret: string) {
    this.account = account;
    this.secret = secret;
  }
}
