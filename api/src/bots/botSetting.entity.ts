import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'bot_settings' })
export class BotSetting {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'jsonb', default: {} })
  value: any;

  @UpdateDateColumn()
  updated_at: Date;
}
