import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'valor_profiles' })
export class ValorProfile {
  @PrimaryColumn({ name: 'account_id', type: 'int' })
  accountId: number;

  @Column({ type: 'int', default: 0 })
  crests: number;

  @Column({ name: 'outbreaks_cleared', type: 'int', default: 0 })
  outbreaksCleared: number;

  @Column({ name: 'zombie_kills', type: 'int', default: 0 })
  zombieKills: number;

  @Column({ name: 'mvp_count', type: 'int', default: 0 })
  mvpCount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
