import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { InspectionCheck } from './entities/inspection-check.entity.js';

@Injectable()
export class InspectionChecksRepository extends BaseRepository<InspectionCheck> {
  constructor(
    @InjectRepository(InspectionCheck) repository: Repository<InspectionCheck>,
  ) {
    super(repository);
  }

  // `indicator` is undefined when the indicator is soft-deleted (join filter).
  findAllWithIndicator(): Promise<InspectionCheck[]> {
    return this.findAll({ relations: { indicator: true } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
