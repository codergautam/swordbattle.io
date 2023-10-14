import { BaseEntity } from './BaseEntity';

class GlobalEntity extends BaseEntity {
  static stateFields = [...BaseEntity.stateFields, 'name', 'coins', 'angle'];
}

export default GlobalEntity;
