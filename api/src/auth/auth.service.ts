import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountsService } from '../accounts/accounts.service';
import { LoginDTO, RegisterDTO } from './auth.dto';
import { JwtPayload } from './auth.interface';
import { Account } from 'src/accounts/account.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly accountsService: AccountsService,
  ) {}
  
  async register(data: RegisterDTO) {
    if (await this.accountsService.findOne({ where: { username: data.username } })) {
      throw new UnauthorizedException('User already exists');
    }

    const account = await this.accountsService.create(data);
    const token = await this.getToken(account);
    return { account: this.accountsService.sanitizeAccount(account), token };
  }

  async login(data: LoginDTO) {
    let account = await this.accountsService.findOne({ where: { username: data.username } });

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
    const payload = { sub: account.username };
    const token = this.jwtService.sign(payload);
    return token;
  }

  async validateAccount(payload: JwtPayload) {
    return this.accountsService.getByUsername(payload.sub);
  }
}
