import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { SecretLoginDTO, LoginDTO, RegisterDTO } from './auth.dto';
import { Account } from 'src/accounts/account.entity';
import validateUsername from 'src/helpers/validateUsername';
import validateClantag from 'src/helpers/validateClantag';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

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
      throw new UnauthorizedException('User does not exist');
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
      throw new UnauthorizedException('User does not exist');
    }
    if (!(await account.checkPassword(data.password))) {
      throw new UnauthorizedException('Wrong password');
    }

    const secret = account.secret;
    return { account: this.accountsService.sanitizeAccount(account), secret };
  }

  async crazygamesLogin(token: string, crazygamesUserId: string, username: string) {
    try {
      const verified = await this.verifyCrazygamesToken(token);
      if (!verified || verified.userId !== crazygamesUserId) {
        throw new UnauthorizedException('Invalid CrazyGames token');
      }

      // Check if account with this CrazyGames user ID already exists
      let account = await this.accountsService.findOne({
        where: { crazygamesUserId }
      });

      if (account) {
        return { account: this.accountsService.sanitizeAccount(account), secret: account.secret };
      }

      // Account doesn't exist, create a new one
      let finalUsername = username;
      let counter = 1;
      while (await this.accountsService.findOneWithLowercase({ where: { username: finalUsername } })) {
        finalUsername = `${username}${counter}`;
        counter++;
      }

      const secret = uuidv4();
      const newAccount = await this.accountsService.create({
        username: finalUsername,
        password: crypto.randomBytes(32).toString('hex'), // Random password (won't be used)
        email: '',
        secret,
        isCrazygames: true,
        crazygamesUserId,
      });

      return { account: this.accountsService.sanitizeAccount(newAccount), secret };
    } catch (error) {
      console.error('[CrazyGames Auth] Error:', error);
      throw new UnauthorizedException('CrazyGames authentication failed');
    }
  }

  private async verifyCrazygamesToken(token: string): Promise<{ userId: string; username: string; gameId: string } | null> {
    try {
      let publicKey = '';

      try {
        const response = await axios.get('https://sdk.crazygames.com/publicKey.json');
        publicKey = response.data.publicKey;
      } catch (error) {
        console.error('[CrazyGames] Failed to fetch public key:', error);
        return null;
      }

      if (!publicKey) {
        console.error('[CrazyGames] Public key is empty');
        return null;
      }

      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256']
      }) as any;

      if (!decoded.userId || !decoded.username || !decoded.gameId) {
        console.error('[CrazyGames] Token missing required fields');
        return null;
      }

      console.log('[CrazyGames] Token verified successfully');

      return {
        userId: decoded.userId,
        username: decoded.username,
        gameId: decoded.gameId
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.error('[CrazyGames] Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        console.error('[CrazyGames] Invalid token signature');
      } else {
        console.error('[CrazyGames] Token verification error:', error);
      }
      return null;
    }
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

  async changeClantag(account: Account, newClantag: string) {
    try {
      let result = await this.accountsService.changeClantag(account.id, newClantag);
      if(result.success) {
        (result as any).secret = account.secret;
      }
    return result;
    } catch (e) {
      console.log(e);
      return {error: e.message};
    }
  }

  async changeUserbio(account: Account, newUserbio: string) {
    try {
      let result = await this.accountsService.changeUserbio(account.id, newUserbio);
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

  async generateApiToken() {
    const secret = process.env.API_TOKEN_SECRET || 'default-secret-change-in-production';
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${timestamp}.${nonce}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return `${payload}.${signature}`;
  }

  static validateApiToken(token: string): boolean {
    const secret = process.env.API_TOKEN_SECRET || 'default-secret-change-in-production';

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const timestamp = parseInt(parts[0], 10);
      const nonce = parts[1];
      const signature = parts[2];

      // Check timestamp is within 5 minutes
      const now = Date.now();
      const MAX_AGE = 300000; // 5 minutes
      if (Math.abs(now - timestamp) > MAX_AGE) return false;

      // Verify signature
      const payload = `${timestamp}.${nonce}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (e) {
      return false;
    }
  }
}
