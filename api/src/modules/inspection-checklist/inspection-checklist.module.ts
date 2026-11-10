import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionCheck } from './entities/inspection-check.entity.js';
import { InspectionIndicator } from './entities/inspection-indicator.entity.js';
import { InspectionChecklistService } from './inspection-checklist.service.js';
import { InspectionChecksController } from './inspection-checks.controller.js';
import { InspectionChecksRepository } from './inspection-checks.repository.js';
import { InspectionIndicatorsController } from './inspection-indicators.controller.js';
import { InspectionIndicatorsRepository } from './inspection-indicators.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionIndicator, InspectionCheck])],
  controllers: [InspectionIndicatorsController, InspectionChecksController],
  providers: [
    InspectionChecklistService,
    InspectionIndicatorsRepository,
    InspectionChecksRepository,
  ],
  exports: [InspectionChecklistService],
})
export class InspectionChecklistModule {}
