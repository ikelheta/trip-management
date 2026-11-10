import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesController } from './countries.controller.js';
import { CountriesRepository } from './countries.repository.js';
import { CountriesService } from './countries.service.js';
import { Country } from './entities/country.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Country])],
  controllers: [CountriesController],
  providers: [CountriesService, CountriesRepository],
  exports: [CountriesService],
})
export class CountriesModule {}
