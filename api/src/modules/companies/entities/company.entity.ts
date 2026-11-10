import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Index('UQ_companies_registration_number', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'registration_number', type: 'varchar', length: 256 })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 256 })
  city: string;

  @Column({ type: 'varchar', length: 256 })
  address: string;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 256 })
  whatsAppNumber: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 256 })
  phoneNumber: string;

  // Urls returned by POST /api/files (ownerType "companies").
  @Column({ name: 'header_url', type: 'varchar', length: 512, nullable: true })
  headerUrl: string | null;

  @Column({ name: 'footer_url', type: 'varchar', length: 512, nullable: true })
  footerUrl: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
