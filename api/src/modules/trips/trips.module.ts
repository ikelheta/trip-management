import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversModule } from '../drivers/drivers.module.js';
import { FilesModule } from '../files/files.module.js';
import { TripInspectionsModule } from '../trip-inspections/trip-inspections.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { Passenger } from './entities/passenger.entity.js';
import { Trip } from './entities/trip.entity.js';
import { PassengersRepository } from './passengers.repository.js';
import { TripsController } from './trips.controller.js';
import { TripsRepository } from './trips.repository.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Passenger]),
    VehiclesModule,
    DriversModule,
    TripInspectionsModule,
    FilesModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TripsRepository, PassengersRepository],
  exports: [TripsService],
})
export class TripsModule {}
