import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import { CountriesService } from '../countries/countries.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { CreateDriverDto } from './dto/create-driver.dto.js';
import type { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { DriversRepository } from './drivers.repository.js';
import { Driver } from './entities/driver.entity.js';

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly countriesService: CountriesService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async findAll(query: ListDriversQueryDto): Promise<PaginatedResult<Driver>> {
    return toPaginatedResult(
      await this.driversRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
  }

  exists(id: string): Promise<boolean> {
    return this.driversRepository.exists({ id });
  }

  async create(dto: CreateDriverDto): Promise<Driver> {
    await this.ensureIdentityIdIsAvailable(dto.identityId);
    await this.ensureNationalityExists(dto.nationalityId);
    await this.ensureVehicleExists(dto.vehicleId);
    return this.driversRepository.create(dto);
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOne(id);

    if (dto.identityId !== undefined && dto.identityId !== driver.identityId) {
      await this.ensureIdentityIdIsAvailable(dto.identityId);
    }
    if (
      dto.nationalityId !== undefined &&
      dto.nationalityId !== driver.nationalityId
    ) {
      await this.ensureNationalityExists(dto.nationalityId);
    }
    if (dto.vehicleId !== undefined && dto.vehicleId !== driver.vehicleId) {
      await this.ensureVehicleExists(dto.vehicleId);
    }

    const changes: DeepPartial<Driver> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.driversRepository.update(driver.id, changes);
    if (!saved) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const driver = await this.findOne(id);
    await this.driversRepository.softDelete(driver.id);
  }

  private async ensureIdentityIdIsAvailable(identityId: string): Promise<void> {
    if (await this.driversRepository.exists({ identityId })) {
      throw new ConflictException('Identity id is already in use');
    }
  }

  private async ensureNationalityExists(nationalityId: string): Promise<void> {
    if (!(await this.countriesService.exists(nationalityId))) {
      throw new BadRequestException(`Country ${nationalityId} does not exist`);
    }
  }

  private async ensureVehicleExists(vehicleId: string): Promise<void> {
    if (!(await this.vehiclesService.exists(vehicleId))) {
      throw new BadRequestException(`Vehicle ${vehicleId} does not exist`);
    }
  }
}
