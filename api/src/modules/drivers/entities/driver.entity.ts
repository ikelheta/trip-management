import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Country } from '../../countries/entities/country.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';

@Entity('drivers')
export class Driver extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Index('UQ_drivers_identity_id', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'identity_id', type: 'varchar', length: 50 })
  identityId: string;

  @Index('IDX_drivers_nationality_id')
  @Column({ name: 'nationality_id', type: 'uuid' })
  nationalityId: string;

  @ManyToOne(() => Country, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'nationality_id',
    foreignKeyConstraintName: 'FK_drivers_nationality_id',
  })
  nationality?: Country;

  @Index('IDX_drivers_vehicle_id')
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'vehicle_id',
    foreignKeyConstraintName: 'FK_drivers_vehicle_id',
  })
  vehicle?: Vehicle;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
