import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsModule } from 'src/accounts/accounts.module';
import { ClansModule } from 'src/clans/clans.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveGameSession } from './game-session.entity';
import { GameSessionService } from './game-session.service';

@Module({
  imports: [
    forwardRef(() => AccountsModule),
    forwardRef(() => ClansModule),
    TypeOrmModule.forFeature([ActiveGameSession]),
  ],
  providers: [AuthService, GameSessionService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
