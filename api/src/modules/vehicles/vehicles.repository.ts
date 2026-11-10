import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  ILike,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';

@Injectable()
export class VehiclesRepository extends BaseRepository<Vehicle> {
  constructor(@InjectRepository(Vehicle) repository: Repository<Vehicle>) {
    super(repository);
  }

  // Searchable columns: plateNumber, model, type. companyId narrows every branch.
  findPaginated(query: ListVehiclesQueryDto): Promise<[Vehicle[], number]> {
    const scope: FindOptionsWhere<Vehicle> = query.companyId
      ? { companyId: query.companyId }
      : {};
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { ...scope, plateNumber: pattern },
            { ...scope, model: pattern },
            { ...scope, type: pattern },
          ]
        : scope,
      order: { createdAt: 'DESC' },
      ...toSkipTake(query),
    });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}
