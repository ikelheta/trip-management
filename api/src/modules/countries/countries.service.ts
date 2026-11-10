import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import type { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import { CountriesRepository } from './countries.repository.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';
import { Country } from './entities/country.entity.js';

@Injectable()
export class CountriesService {
  constructor(private readonly countriesRepository: CountriesRepository) {}

  async findAll(query: BaseListQueryDto): Promise<PaginatedResult<Country>> {
    return toPaginatedResult(
      await this.countriesRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Country> {
    const country = await this.countriesRepository.findById(id);
    if (!country) {
      throw new NotFoundException(`Country ${id} not found`);
    }
    return country;
  }

  exists(id: string): Promise<boolean> {
    return this.countriesRepository.exists({ id });
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    await this.ensureNameArIsAvailable(dto.nameAr);
    await this.ensureNameEnIsAvailable(dto.nameEn);
    return this.countriesRepository.create(dto);
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    const country = await this.findOne(id);

    if (dto.nameAr !== undefined && dto.nameAr !== country.nameAr) {
      await this.ensureNameArIsAvailable(dto.nameAr);
    }
    if (dto.nameEn !== undefined && dto.nameEn !== country.nameEn) {
      await this.ensureNameEnIsAvailable(dto.nameEn);
    }

    const changes: DeepPartial<Country> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.countriesRepository.update(country.id, changes);
    if (!saved) {
      throw new NotFoundException(`Country ${id} not found`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const country = await this.findOne(id);
    await this.countriesRepository.softDelete(country.id);
  }

  private async ensureNameArIsAvailable(nameAr: string): Promise<void> {
    if (await this.countriesRepository.exists({ nameAr })) {
      throw new ConflictException('Arabic name is already in use');
    }
  }

  private async ensureNameEnIsAvailable(nameEn: string): Promise<void> {
    if (await this.countriesRepository.exists({ nameEn })) {
      throw new ConflictException('English name is already in use');
    }
  }
}
