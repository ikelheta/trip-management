import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { InspectionIndicator } from './inspection-indicator.entity.js';

// Names are unique within their indicator among live checks.
@Entity('inspection_checks')
@Index('UQ_inspection_checks_indicator_id_name_ar', ['indicatorId', 'nameAr'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('UQ_inspection_checks_indicator_id_name_en', ['indicatorId', 'nameEn'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class InspectionCheck extends BaseEntity {
  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @ManyToOne(() => InspectionIndicator, (indicator) => indicator.checks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'indicator_id',
    foreignKeyConstraintName: 'FK_inspection_checks_indicator_id',
  })
  indicator?: Relation<InspectionIndicator>;

  @Column({ name: 'name_ar', type: 'varchar', length: 256 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 256 })
  nameEn: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
