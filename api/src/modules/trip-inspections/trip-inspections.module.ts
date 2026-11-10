import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionChecklistModule } from '../inspection-checklist/inspection-checklist.module.js';
import { TripInspectionResult } from './entities/trip-inspection-result.entity.js';
import { TripInspection } from './entities/trip-inspection.entity.js';
import { TripInspectionResultsRepository } from './trip-inspection-results.repository.js';
import { TripInspectionsRepository } from './trip-inspections.repository.js';
import { TripInspectionsService } from './trip-inspections.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripInspection, TripInspectionResult]),
    InspectionChecklistModule,
  ],
  providers: [
    TripInspectionsService,
    TripInspectionsRepository,
    TripInspectionResultsRepository,
  ],
  exports: [TripInspectionsService],
})
export class TripInspectionsModule {}
