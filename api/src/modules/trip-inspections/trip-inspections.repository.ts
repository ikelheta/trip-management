import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { TripInspection } from './entities/trip-inspection.entity.js';

@Injectable()
export class TripInspectionsRepository extends BaseRepository<TripInspection> {
  constructor(
    @InjectRepository(TripInspection) repository: Repository<TripInspection>,
  ) {
    super(repository);
  }

  findByTripIdWithResults(tripId: string): Promise<TripInspection | null> {
    return this.findOne({ where: { tripId }, relations: { results: true } });
  }

  findByTripIdsWithResults(tripIds: string[]): Promise<TripInspection[]> {
    return this.findAll({
      where: { tripId: In(tripIds) },
      relations: { results: true },
    });
  }
}
