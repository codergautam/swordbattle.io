import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsModule } from 'src/accounts/accounts.module';
import { TotalStats } from 'src/stats/totalStats.entity';

@Module({
  imports: [
    forwardRef(() => AccountsModule),
    TypeOrmModule.forFeature([TotalStats]),
  ],
  providers: [AuthService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
