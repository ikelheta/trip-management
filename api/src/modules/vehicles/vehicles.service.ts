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
import { CompaniesService } from '../companies/companies.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesRepository } from './vehicles.repository.js';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly companiesService: CompaniesService,
  ) {}

  async findAll(
    query: ListVehiclesQueryDto,
  ): Promise<PaginatedResult<Vehicle>> {
    return toPaginatedResult(
      await this.vehiclesRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  exists(id: string): Promise<boolean> {
    return this.vehiclesRepository.exists({ id });
  }

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    await this.ensurePlateNumberIsAvailable(dto.plateNumber);
    await this.ensureCompanyExists(dto.companyId);
    return this.vehiclesRepository.create(dto);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (
      dto.plateNumber !== undefined &&
      dto.plateNumber !== vehicle.plateNumber
    ) {
      await this.ensurePlateNumberIsAvailable(dto.plateNumber);
    }
    if (dto.companyId !== undefined && dto.companyId !== vehicle.companyId) {
      await this.ensureCompanyExists(dto.companyId);
    }

    const changes: DeepPartial<Vehicle> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.vehiclesRepository.update(vehicle.id, changes);
    if (!saved) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.softDelete(vehicle.id);
  }

  private async ensurePlateNumberIsAvailable(
    plateNumber: string,
  ): Promise<void> {
    if (await this.vehiclesRepository.exists({ plateNumber })) {
      throw new ConflictException('Plate number is already in use');
    }
  }

  private async ensureCompanyExists(companyId: string): Promise<void> {
    if (!(await this.companiesService.exists(companyId))) {
      throw new BadRequestException(`Company ${companyId} does not exist`);
    }
  }
}
