import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, IsNull, Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity.js';

@Injectable()
export class FilesRepository {
  constructor(
    @InjectRepository(FileEntity)
    private readonly repository: Repository<FileEntity>,
  ) {}

  findById(id: string): Promise<FileEntity | null> {
    return this.repository.findOneBy({ id });
  }

  findByOwner(ownerType: string, ownerId: string): Promise<FileEntity[]> {
    return this.repository.find({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  create(data: DeepPartial<FileEntity>): Promise<FileEntity> {
    return this.repository.save(this.repository.create(data));
  }

  // Atomic: only links a live file of this ownerType that has no owner yet.
  async attachOwner(
    id: string,
    ownerType: string,
    ownerId: string,
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id, ownerType, ownerId: IsNull(), deletedAt: IsNull() },
      { ownerId },
    );
    return result.affected === 1;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
