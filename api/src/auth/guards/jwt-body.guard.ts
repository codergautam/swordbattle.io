import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtBodyGuard extends AuthGuard('jwt-body') {}
