import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { Company } from './entities/company.entity.js';

@Injectable()
export class CompaniesRepository extends BaseRepository<Company> {
  constructor(@InjectRepository(Company) repository: Repository<Company>) {
    super(repository);
  }

  // Searchable columns: name, registrationNumber, city.
  findPaginated(query: BaseListQueryDto): Promise<[Company[], number]> {
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { name: pattern },
            { registrationNumber: pattern },
            { city: pattern },
          ]
        : {},
      order: { createdAt: 'DESC' },
      ...toSkipTake(query),
    });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}
