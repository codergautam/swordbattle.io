import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'valor_awards' })
export class ValorAward {
  @PrimaryColumn({ name: 'outbreak_id', type: 'varchar', length: 36 })
  outbreakId: string;

  @PrimaryColumn({ name: 'account_id', type: 'int' })
  accountId: number;

  @Column({ type: 'int' })
  crests: number;

  @Column({ name: 'zombie_kills', type: 'int', default: 0 })
  zombieKills: number;

  @Column({ type: 'boolean', default: false })
  mvp: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
