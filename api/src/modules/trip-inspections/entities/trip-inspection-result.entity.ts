import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { InspectionCheck } from '../../inspection-checklist/entities/inspection-check.entity.js';
import { TripInspection } from './trip-inspection.entity.js';

// One row per check. Names and sort orders are copied at inspection time so
// later checklist edits do not rewrite past inspections.
@Entity('trip_inspection_results')
@Index(
  'UQ_trip_inspection_results_inspection_id_check_id',
  ['inspectionId', 'checkId'],
  { unique: true },
)
export class TripInspectionResult extends BaseEntity {
  @Column({ name: 'inspection_id', type: 'uuid' })
  inspectionId: string;

  @ManyToOne(() => TripInspection, (inspection) => inspection.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'inspection_id',
    foreignKeyConstraintName: 'FK_trip_inspection_results_inspection_id',
  })
  inspection?: Relation<TripInspection>;

  @Index('IDX_trip_inspection_results_check_id')
  @Column({ name: 'check_id', type: 'uuid' })
  checkId: string;

  @ManyToOne(() => InspectionCheck, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'check_id',
    foreignKeyConstraintName: 'FK_trip_inspection_results_check_id',
  })
  check?: InspectionCheck;

  // true = good.
  @Column({ type: 'boolean' })
  status: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Snapshot. No FK on indicator_id: it only groups the results.
  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({ name: 'indicator_name_ar', type: 'varchar', length: 256 })
  indicatorNameAr: string;

  @Column({ name: 'indicator_name_en', type: 'varchar', length: 256 })
  indicatorNameEn: string;

  @Column({ name: 'indicator_sort_order', type: 'int' })
  indicatorSortOrder: number;

  @Column({ name: 'check_name_ar', type: 'varchar', length: 256 })
  checkNameAr: string;

  @Column({ name: 'check_name_en', type: 'varchar', length: 256 })
  checkNameEn: string;

  @Column({ name: 'check_sort_order', type: 'int' })
  checkSortOrder: number;
}
