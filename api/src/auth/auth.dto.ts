import { Length, IsEmail } from 'class-validator';

export class RegisterDTO {
  @IsEmail() email: string;

  @Length(2, 30) username: string;
  
  @Length(8, 128) password: string;
}

export class LoginDTO {
  @Length(2, 30) username: string;
  
  @Length(8, 128) password: string;
}
