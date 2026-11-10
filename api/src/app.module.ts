import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { CountriesModule } from './modules/countries/countries.module.js';
import { DriversModule } from './modules/drivers/drivers.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { InspectionChecklistModule } from './modules/inspection-checklist/inspection-checklist.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    FilesModule,
    CompaniesModule,
    VehiclesModule,
    CountriesModule,
    DriversModule,
    TripsModule,
    InspectionChecklistModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
