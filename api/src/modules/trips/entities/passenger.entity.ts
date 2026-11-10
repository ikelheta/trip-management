import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Trip } from './trip.entity.js';

// Passengers exist only through their trip: no soft delete, replaced as a list.
@Entity('passengers')
@Index('UQ_passengers_trip_id_identity_number', ['tripId', 'identityNumber'], {
  unique: true,
})
export class Passenger extends BaseEntity {
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, (trip) => trip.passengers, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'trip_id',
    foreignKeyConstraintName: 'FK_passengers_trip_id',
  })
  trip?: Relation<Trip>;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  // Digits only, kept as text so leading zeros survive.
  @Column({ name: 'identity_number', type: 'varchar', length: 50 })
  identityNumber: string;

  @Column({ name: 'doc_type', type: 'varchar', length: 50 })
  docType: string;

  @Column({ type: 'varchar', length: 256 })
  nationality: string;
}
