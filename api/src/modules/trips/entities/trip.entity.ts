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
import { Driver } from '../../drivers/entities/driver.entity.js';
import type { TripInspection } from '../../trip-inspections/entities/trip-inspection.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Passenger } from './passenger.entity.js';

@Entity('trips')
export class Trip extends BaseEntity {
  @Column({ name: 'trip_name', type: 'varchar', length: 256, nullable: true })
  tripName: string | null;

  @Column({ name: 'secret_code', type: 'varchar', length: 50, nullable: true })
  secretCode: string | null;

  @Index('IDX_trips_vehicle_id')
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'vehicle_id',
    foreignKeyConstraintName: 'FK_trips_vehicle_id',
  })
  vehicle?: Vehicle;

  @Index('IDX_trips_driver_id')
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'driver_id',
    foreignKeyConstraintName: 'FK_trips_driver_id',
  })
  driver?: Driver;

  // "YYYY-MM-DD": TypeORM hydrates date columns as strings.
  @Index('IDX_trips_date')
  @Column({ type: 'date' })
  date: string;

  // Postgres returns "HH:mm:ss".
  @Column({ type: 'time' })
  time: string;

  // Free text ("Riyadh", "King Khalid Airport"). Null only for trips created before Story 13.
  @Column({ type: 'varchar', length: 256, nullable: true })
  origin: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  destination: string | null;

  // "YYYYMMDD-NNNN": trip date + sequence per date, assigned on create, never changed or reused.
  // Printed under the barcode of the trip contract (front end). Not partial: deleted trips keep theirs.
  @Index('UQ_trips_contract_number', { unique: true })
  @Column({ name: 'contract_number', type: 'varchar', length: 20 })
  contractNumber: string;

  // Download path of the QR code file (FilesService). Null until it is generated.
  @Column({ name: 'qr_code_url', type: 'varchar', length: 512, nullable: true })
  qrCodeUrl: string | null;

  @OneToMany(() => Passenger, (passenger) => passenger.trip)
  passengers?: Relation<Passenger[]>;

  // Not a column: TripsService attaches it from the trip-inspections module.
  // null for trips created before inspections were required.
  inspection?: TripInspection | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
