import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'allowed_accounts' })
export class AllowedAccount {
  @PrimaryColumn()
  account_id: number;
}
