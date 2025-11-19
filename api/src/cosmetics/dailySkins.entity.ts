import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'daily_skins' })
export class DailySkins {
  @PrimaryColumn({ type: 'date' })
  date: string; // Format: YYYY-MM-DD

  @Column({ type: 'int', array: true })
  skinIds: number[]; // Array of 60 skin IDs for the day

  @CreateDateColumn()
  createdAt: Date;
}
