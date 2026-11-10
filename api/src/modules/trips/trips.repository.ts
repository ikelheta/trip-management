import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { Trip } from './entities/trip.entity.js';

@Injectable()
export class TripsRepository extends BaseRepository<Trip> {
  constructor(@InjectRepository(Trip) repository: Repository<Trip>) {
    super(repository);
  }

  findByIdWithPassengers(id: string): Promise<Trip | null> {
    return this.repository.findOne({
      where: { id },
      relations: { passengers: true },
    });
  }

  // Searchable columns: tripName, origin, destination. vehicleId/driverId/date range narrow the result.
  findPaginated(query: ListTripsQueryDto): Promise<[Trip[], number]> {
    const dateRange = toDateRange(query.dateFrom, query.dateTo);
    const scope: FindOptionsWhere<Trip> = {
      ...(query.vehicleId && { vehicleId: query.vehicleId }),
      ...(query.driverId && { driverId: query.driverId }),
      ...(dateRange && { date: dateRange }),
    };
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { ...scope, tripName: pattern },
            { ...scope, origin: pattern },
            { ...scope, destination: pattern },
          ]
        : scope,
      relations: { passengers: true },
      order: { date: 'DESC', time: 'DESC', createdAt: 'DESC' },
      ...toSkipTake(query),
    });
  }

  /**
   * Next "YYYYMMDD-NNNN" for a trip date. Call inside the create transaction: the advisory
   * lock serialises creates for the same date until commit. Counts deleted trips too.
   */
  async nextContractNumber(
    date: string,
    manager: EntityManager,
  ): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `trip-contract-${date}`,
    ]);
    const prefix = date.replaceAll('-', '');
    // "YYYYMMDD-" is 9 characters, so the sequence starts at position 10.
    const rows: { last: number }[] = await manager.query(
      `SELECT COALESCE(MAX(SUBSTRING("contract_number" FROM 10)::int), 0)::int AS "last"
       FROM "trips" WHERE "contract_number" LIKE $1`,
      [`${prefix}-%`],
    );
    return `${prefix}-${String(rows[0].last + 1).padStart(4, '0')}`;
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}

// Both bounds inclusive; "YYYY-MM-DD" strings compare correctly against a date column.
function toDateRange(from?: string, to?: string) {
  if (from && to) {
    return Between(from, to);
  }
  if (from) {
    return MoreThanOrEqual(from);
  }
  return to ? LessThanOrEqual(to) : undefined;
}
