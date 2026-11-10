import {
  AfterInsert,
  AfterLoad,
  Column,
  DeleteDateColumn,
  Entity,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { toFileUrl } from '../file-url.js';

@Entity('files')
@Index('IDX_files_owner_type_owner_id', ['ownerType', 'ownerId'])
export class FileEntity extends BaseEntity {
  @Column({ name: 'owner_type', type: 'varchar', length: 50 })
  ownerType: string;

  // Null until the owning module links the file (FilesService.attach).
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Index('UQ_files_storage_key', { unique: true })
  @Column({ name: 'storage_key', type: 'varchar', length: 64 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  @Column({ type: 'char', length: 64 })
  checksum: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Not a column: the download path clients send back, e.g. a company's headerUrl.
  url: string;

  @AfterLoad()
  @AfterInsert()
  protected setUrl(): void {
    this.url = toFileUrl(this.id);
  }
}
