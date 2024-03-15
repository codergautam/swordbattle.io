import { Length, IsEmail } from 'class-validator';
import { config } from 'src/config';

export class RegisterDTO {
  @Length(0, Infinity) email: string;

  @Length(config.usernameLength[0], config.usernameLength[1]) username: string;

  @Length(8, 128) password: string;
}

export class LoginDTO {
  @Length(0, Infinity) username: string;

  @Length(0, Infinity) password: string;
}
export class SecretLoginDTO {
  @Length(0, Infinity) secret: string;
}