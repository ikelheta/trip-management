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
import { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { Driver } from './entities/driver.entity.js';

@Injectable()
export class DriversRepository extends BaseRepository<Driver> {
  constructor(@InjectRepository(Driver) repository: Repository<Driver>) {
    super(repository);
  }

  // Searchable columns: name, identityId. nationalityId/vehicleId narrow every branch.
  findPaginated(query: ListDriversQueryDto): Promise<[Driver[], number]> {
    const scope: FindOptionsWhere<Driver> = {
      ...(query.nationalityId && { nationalityId: query.nationalityId }),
      ...(query.vehicleId && { vehicleId: query.vehicleId }),
    };
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { ...scope, name: pattern },
            { ...scope, identityId: pattern },
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
