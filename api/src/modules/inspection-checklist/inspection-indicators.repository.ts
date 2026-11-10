import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { InspectionIndicator } from './entities/inspection-indicator.entity.js';

// Joined checks exclude soft-deleted rows (TypeORM adds deleted_at IS NULL to joins).
@Injectable()
export class InspectionIndicatorsRepository extends BaseRepository<InspectionIndicator> {
  constructor(
    @InjectRepository(InspectionIndicator)
    repository: Repository<InspectionIndicator>,
  ) {
    super(repository);
  }

  findAllWithChecks(): Promise<InspectionIndicator[]> {
    return this.findAll({
      relations: { checks: true },
      order: { sortOrder: 'ASC', nameEn: 'ASC' },
    });
  }

  findByIdWithChecks(id: string): Promise<InspectionIndicator | null> {
    return this.findOne({ where: { id }, relations: { checks: true } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
