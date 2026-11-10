import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { InspectionCheck } from './inspection-check.entity.js';

@Entity('inspection_indicators')
export class InspectionIndicator extends BaseEntity {
  @Index('UQ_inspection_indicators_name_ar', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_ar', type: 'varchar', length: 256 })
  nameAr: string;

  @Index('UQ_inspection_indicators_name_en', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_en', type: 'varchar', length: 256 })
  nameEn: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => InspectionCheck, (check) => check.indicator)
  checks?: Relation<InspectionCheck[]>;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
