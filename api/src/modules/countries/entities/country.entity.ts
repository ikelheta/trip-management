import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity('countries')
export class Country extends BaseEntity {
  @Index('UQ_countries_name_ar', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_ar', type: 'varchar', length: 256 })
  nameAr: string;

  @Index('UQ_countries_name_en', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_en', type: 'varchar', length: 256 })
  nameEn: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
