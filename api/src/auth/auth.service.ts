import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountsService } from '../accounts/accounts.service';
import { LoginDTO, RegisterDTO } from './auth.dto';
import { JwtPayload } from './auth.interface';

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
    const payload = { sub: account.username };
    const token = this.jwtService.sign(payload);
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

    const payload = { sub: account.username };
    const token = this.jwtService.sign(payload);
    return { account: this.accountsService.sanitizeAccount(account), token };
  }

  async validateAccount(payload: JwtPayload) {
    const account = await this.accountsService.findOne({ where: { username: payload.sub } });
    if (!account) {
      throw new UnauthorizedException('User not found');
    }
    return this.accountsService.sanitizeAccount(account);
  }
}
