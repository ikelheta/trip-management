import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { TripInspectionResult } from './entities/trip-inspection-result.entity.js';

// Write methods take the inspection's transaction.
@Injectable()
export class TripInspectionResultsRepository extends BaseRepository<TripInspectionResult> {
  constructor(
    @InjectRepository(TripInspectionResult)
    repository: Repository<TripInspectionResult>,
  ) {
    super(repository);
  }

  async createMany(
    results: DeepPartial<TripInspectionResult>[],
    manager: EntityManager,
  ): Promise<void> {
    const repository = this.repositoryFor(manager);
    await repository.save(repository.create(results));
  }

  async updateResult(
    inspectionId: string,
    checkId: string,
    changes: Pick<TripInspectionResult, 'status' | 'note'>,
    manager: EntityManager,
  ): Promise<void> {
    await this.repositoryFor(manager).update(
      { inspectionId, checkId },
      changes,
    );
  }
}
