import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountsService } from '../accounts/accounts.service';
import { LoginDTO, RegisterDTO } from './auth.dto';
import { JwtPayload } from './auth.interface';
import { Account } from 'src/accounts/account.entity';
import validateUsername from 'src/helpers/validateUsername';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly accountsService: AccountsService,
  ) {}

  async register(data: RegisterDTO) {
        // validate username
        if(validateUsername(data.username)) {
          throw new UnauthorizedException(validateUsername(data.username));
        }
    if (await this.accountsService.findOne({ where: { username: data.username } })) {
      throw new UnauthorizedException('User already exists');
    }
    if(await this.accountsService.findOne({ where: { email: data.email } })) {
      throw new UnauthorizedException('Email already used by another account');
    }

    const account = await this.accountsService.create(data);
    const token = await this.getToken(account);
    return { account: this.accountsService.sanitizeAccount(account), token };
  }

  async login(data: LoginDTO) {
    let account;
    try {
    account = await this.accountsService.findOne({ where: { username: data.username } }, true);
    } catch (e) {
      account = await this.accountsService.findOne({ where: { email: data.username } }, true);
    }

    if (!account) {
      throw new UnauthorizedException('User does not exists');
    }
    if (!(await account.checkPassword(data.password))) {
      throw new UnauthorizedException('Wrong password');
    }

    const token = await this.getToken(account);
    return { account: this.accountsService.sanitizeAccount(account), token };
  }

  async getToken(account: Account) {
    const payload = { sub: account.id };
    const token = this.jwtService.sign(payload);
    return token;
  }

  async getIdFromToken(token: string) {
    const payload = this.jwtService.decode(token) as JwtPayload;
    return payload.sub;
  }

  async getAccountById(id: number) {
    return this.accountsService.getById(id);
  }

  async changeUsername(account: Account, newUsername: string) {
    try {
      let result = await this.accountsService.changeUsername(account.id, newUsername);
      if(result.success) {
        // make new token
        const token = await this.getToken(account);
        (result as any).token = token;
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

  async validateAccount(payload: JwtPayload) {
    return this.accountsService.getById(payload.sub);
  }
}
