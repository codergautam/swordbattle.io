import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'allowed_ips' })
export class AllowedIp {
  @PrimaryColumn()
  ip: string;
}
