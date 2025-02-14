import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { SecretLoginDTO, LoginDTO, RegisterDTO } from './auth.dto';
import { Account } from 'src/accounts/account.entity';
import validateUsername from 'src/helpers/validateUsername';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountsService: AccountsService,
  ) {}

  async register(data: RegisterDTO) {
    // validate username
    if(validateUsername(data.username)) {
      throw new UnauthorizedException(validateUsername(data.username));
    }
    // validate email
    if(data.email && /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/.test(data.email) === false) {
      throw new UnauthorizedException('Invalid email');
    }

    if (await this.accountsService.findOneWithLowercase({ where: { username: data.username } })) {
      throw new UnauthorizedException('Username already exists');
    }
    if (data.email && await this.accountsService.findOneWithLowercase({ where: { email: data.email } })) {
      throw new UnauthorizedException('Email already exists');
    }
    const secret = uuidv4();
    const account = await this.accountsService.create({secret, ...data});
    return { account: this.accountsService.sanitizeAccount(account), secret };
  }


  async secretLogin(data: SecretLoginDTO) {
    let account;
    try {
      account = await this.accountsService.findOne({ where: { secret: data.secret } });
    } catch (e) {
      throw new UnauthorizedException('User does not exists');
    }

    return { account: this.accountsService.sanitizeAccount(account), secret: data.secret };
  }

  async login(data: LoginDTO) {
    let account;
    try {
        account = await this.accountsService.findOneWithLowercase({ where: { username: data.username } });
    } catch (e) {
        account = await this.accountsService.findOneWithLowercase({ where: { email: data.username } });
    }

    if (!account) {
      throw new UnauthorizedException('User does not exists');
    }
    if (!(await account.checkPassword(data.password))) {
      throw new UnauthorizedException('Wrong password');
    }

    const secret = account.secret;
    return { account: this.accountsService.sanitizeAccount(account), secret };
  }

  async getToken(account: Account) {
    throw new Error('DEPRECATED, USE SECRET');
  }

  async getIdFromToken(token: string) {
    throw new Error('DEPRECATED, USE getIdFromSecret');
  }

  async getAccountFromSecret(secret: string) {
    const account = await this.accountsService.findOne({ where: { secret } });
    return account;
  }

  async getIdFromSecret(secret: string) {
    const account = await this.getAccountFromSecret(secret);
    return account.id;
  }

  async getAccountById(id: number) {
    return this.accountsService.getById(id);
  }

  async changeUsername(account: Account, newUsername: string) {
    try {
      let result = await this.accountsService.changeUsername(account.id, newUsername);
      if(result.success) {
        (result as any).secret = account.secret;
      }
    return result;
    } catch (e) {
      console.log(e);
      return {error: e.message};
    }
  }

  async updateAccount(account: Account) {
    return this.accountsService.update(account.id, account);
  }

  async getAccountFromUsername(username: string) {
    return this.accountsService.getByUsername(username);
  }

  async validateAccount(payload: any) {
    throw new Error('DEPRECATED');
  }
}
