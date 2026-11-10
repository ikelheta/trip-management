import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesRepository } from './vehicles.repository.js';
import { VehiclesService } from './vehicles.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), CompaniesModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository],
  exports: [VehiclesService],
})
export class VehiclesModule {}
