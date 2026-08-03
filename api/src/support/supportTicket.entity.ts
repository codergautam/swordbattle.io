import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TicketMessage = { from: 'user' | 'staff'; text: string; at: number; images?: string[] };

@Entity({ name: 'support_tickets' })
export class SupportTicket {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;

  @Column() category: string;

  @Column({ default: '' }) subject: string;

  @Column({ nullable: true }) account_id: number;
  @Column({ nullable: true }) username: string;
  @Column({ nullable: true }) client_id: string;
  @Column({ nullable: true }) ip: string;

  @Column({ nullable: true }) contact: string;

  @Column({ type: 'jsonb', default: '{}' }) details: Record<string, any>;

  @Column({ type: 'jsonb', default: '[]' }) messages: TicketMessage[];

  @Column({ default: 'open' }) status: string;

  @Column({ default: false }) unread_for_user: boolean;

  @Column({ default: true }) unread_for_admin: boolean;
}
