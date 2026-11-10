import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Company } from '../../companies/entities/company.entity.js';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Index('UQ_vehicles_plate_number', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'plate_number', type: 'varchar', length: 50 })
  plateNumber: string;

  @Column({ type: 'varchar', length: 256 })
  model: string;

  @Column({ type: 'varchar', length: 256 })
  type: string;

  @Index('IDX_vehicles_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_vehicles_company_id',
  })
  company?: Company;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
