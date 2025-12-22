import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'swearing_incidents' })
export class SwearingIncident {
  @PrimaryGeneratedColumn() id: number;

  @CreateDateColumn() created_at: Date;

  @Column({ nullable: true }) username: string;

  @Column({ nullable: true }) account_id: number;

  @Column({ nullable: true }) ip: string;

  @Column() message: string;

  @Column('text', { array: true }) matched_words: string[];
}
