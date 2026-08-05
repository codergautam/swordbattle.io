import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'announcements' })
export class Announcement {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;

  @Column({ default: '' }) title: string;

  @Column({ type: 'text', default: '' }) body: string;

  @Column({ default: 'book' }) icon: string;

  @Column({ default: '#4444ee' }) color: string;

  @Column({ default: true }) published: boolean;

  @Column({ default: false }) is_update: boolean;
}
