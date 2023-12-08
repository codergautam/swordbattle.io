// transaction.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from 'src/transactions/transactions.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  exports: [TypeOrmModule] // Export TypeOrmModule for use in other modules
})
export class TransactionModule {}
