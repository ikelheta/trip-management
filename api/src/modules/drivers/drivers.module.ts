import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesModule } from '../countries/countries.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { DriversController } from './drivers.controller.js';
import { DriversRepository } from './drivers.repository.js';
import { DriversService } from './drivers.service.js';
import { Driver } from './entities/driver.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver]),
    CountriesModule,
    VehiclesModule,
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService],
})
export class DriversModule {}
