import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'skin_buy_counts' })
export class SkinBuyCount {
  @PrimaryColumn() skinId: number;

  @Column({ default: 0 }) count: number;

  @UpdateDateColumn() updatedAt: Date;
}
