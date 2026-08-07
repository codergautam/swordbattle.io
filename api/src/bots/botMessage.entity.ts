import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bot_messages' })
export class BotMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: 'leaderboard' })
  bot: string;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: false })
  ping: boolean;

  @Column({ type: 'jsonb', default: [] })
  reactions: string[];

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date;

  @Column({ type: 'text', nullable: true })
  error: string;
}
