import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from '../files/files.module.js';
import { CompaniesController } from './companies.controller.js';
import { CompaniesRepository } from './companies.repository.js';
import { CompaniesService } from './companies.service.js';
import { Company } from './entities/company.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), FilesModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesService],
})
export class CompaniesModule {}
