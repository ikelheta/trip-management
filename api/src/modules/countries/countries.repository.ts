import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { Country } from './entities/country.entity.js';

@Injectable()
export class CountriesRepository extends BaseRepository<Country> {
  constructor(@InjectRepository(Country) repository: Repository<Country>) {
    super(repository);
  }

  // Searchable columns: nameAr, nameEn. Seeded rows share created_at, so id keeps pages stable.
  findPaginated(query: BaseListQueryDto): Promise<[Country[], number]> {
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern ? [{ nameAr: pattern }, { nameEn: pattern }] : {},
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}
