import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('sessions')
@Index('IDX_session_expire', ['expire'])
export class Session {
  @PrimaryColumn('varchar', { length: 255 })
  sid: string;

  @Column('json')
  sess: any;

  @Column('timestamp')
  expire: Date;
}
