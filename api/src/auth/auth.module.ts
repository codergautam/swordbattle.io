import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsModule } from 'src/accounts/accounts.module';
import { ClansModule } from 'src/clans/clans.module';

@Module({
  imports: [
    forwardRef(() => AccountsModule),
    forwardRef(() => ClansModule),
  ],
  providers: [AuthService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
