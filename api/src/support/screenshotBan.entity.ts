import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity({ name: 'support_screenshot_bans' })
export class ScreenshotBan {
  @PrimaryGeneratedColumn() id: number;
  @CreateDateColumn() created_at: Date;

  @Index() @Column({ nullable: true }) account_id: number;
  @Index() @Column({ nullable: true }) client_id: string;
  @Index() @Column({ nullable: true }) ip: string;

  @Column({ default: '' }) reason: string;
}
