import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Trip } from '../../trips/entities/trip.entity.js';
import { TripInspectionResult } from './trip-inspection-result.entity.js';

@Entity('trip_inspections')
export class TripInspection extends BaseEntity {
  // One live inspection per trip; a soft-deleted one does not block a new one.
  @Index('UQ_trip_inspections_trip_id', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'trip_id',
    foreignKeyConstraintName: 'FK_trip_inspections_trip_id',
  })
  trip?: Trip;

  @Column({ name: 'inspected_at', type: 'timestamptz' })
  inspectedAt: Date;

  @OneToMany(() => TripInspectionResult, (result) => result.inspection)
  results?: Relation<TripInspectionResult[]>;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
