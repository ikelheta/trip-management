import { BadRequestException, Injectable } from '@nestjs/common';
import type { DeepPartial, EntityManager } from 'typeorm';
import {
  InspectionChecklistService,
  type ActiveInspectionCheck,
} from '../inspection-checklist/inspection-checklist.service.js';
import type { CreateTripInspectionDto } from './dto/create-trip-inspection.dto.js';
import type { InspectionResultDto } from './dto/inspection-result.dto.js';
import type { UpdateTripInspectionDto } from './dto/update-trip-inspection.dto.js';
import type { TripInspectionResult } from './entities/trip-inspection-result.entity.js';
import type { TripInspection } from './entities/trip-inspection.entity.js';
import { TripInspectionResultsRepository } from './trip-inspection-results.repository.js';
import { TripInspectionsRepository } from './trip-inspections.repository.js';

/** A new inspection checked against the live checklist, ready to insert. */
export interface PreparedTripInspection {
  inspectedAt: Date;
  results: DeepPartial<TripInspectionResult>[];
}

/**
 * Pre-trip inspections, used only by TripsService: an inspection is created
 * with its trip and edited through it, inside the trip's transaction.
 */
@Injectable()
export class TripInspectionsService {
  constructor(
    private readonly inspectionsRepository: TripInspectionsRepository,
    private readonly resultsRepository: TripInspectionResultsRepository,
    private readonly checklistService: InspectionChecklistService,
  ) {}

  /** Live inspections of these trips, with their results. */
  async findByTripIds(tripIds: string[]): Promise<TripInspection[]> {
    if (tripIds.length === 0) {
      return [];
    }
    return this.inspectionsRepository.findByTripIdsWithResults(tripIds);
  }

  /** Requires one result per live check, exactly once. Call before the trip's transaction. */
  async prepare(dto: CreateTripInspectionDto): Promise<PreparedTripInspection> {
    const checks = await this.checklistService.findActiveChecks();
    if (checks.length === 0) {
      throw new BadRequestException('No inspection checks are configured');
    }
    const checkIds = new Set(checks.map((check) => check.id));
    const resultsByCheckId = new Map(
      dto.results.map((result) => [result.checkId, result]),
    );

    const unknown = dto.results
      .map((result) => result.checkId)
      .filter((checkId) => !checkIds.has(checkId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown or deleted checks: ${unknown.join(', ')}`,
      );
    }
    const missing = checks
      .filter((check) => !resultsByCheckId.has(check.id))
      .map((check) => check.id);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing results for checks: ${missing.join(', ')}`,
      );
    }

    return {
      inspectedAt: dto.inspectedAt ? new Date(dto.inspectedAt) : new Date(),
      // Every check has a result here: unknown and missing were rejected above.
      results: checks.flatMap((check) => {
        const result = resultsByCheckId.get(check.id);
        return result ? [toResultRow(check, result)] : [];
      }),
    };
  }

  async createForTrip(
    tripId: string,
    prepared: PreparedTripInspection,
    manager: EntityManager,
  ): Promise<void> {
    const inspection = await this.inspectionsRepository.create(
      { tripId, inspectedAt: prepared.inspectedAt },
      manager,
    );
    await this.resultsRepository.createMany(
      prepared.results.map((result) => ({
        ...result,
        inspectionId: inspection.id,
      })),
      manager,
    );
  }

  // Runs inside the trip's transaction: a 400 here rolls back the whole trip update.
  async updateForTrip(
    tripId: string,
    dto: UpdateTripInspectionDto,
    manager: EntityManager,
  ): Promise<void> {
    const inspection =
      await this.inspectionsRepository.findByTripIdWithResults(tripId);
    if (!inspection) {
      throw new BadRequestException(`Trip ${tripId} has no inspection`);
    }

    const ownCheckIds = new Set(
      (inspection.results ?? []).map((result) => result.checkId),
    );
    const foreign = (dto.results ?? [])
      .map((result) => result.checkId)
      .filter((checkId) => !ownCheckIds.has(checkId));
    if (foreign.length > 0) {
      throw new BadRequestException(
        `Checks not part of this inspection: ${foreign.join(', ')}`,
      );
    }

    if (dto.inspectedAt !== undefined) {
      await this.inspectionsRepository.update(
        inspection.id,
        { inspectedAt: new Date(dto.inspectedAt) },
        manager,
      );
    }
    // Each item replaces that check's status and note (omitted note = none).
    for (const result of dto.results ?? []) {
      await this.resultsRepository.updateResult(
        inspection.id,
        result.checkId,
        { status: result.status, note: result.note ?? null },
        manager,
      );
    }
  }
}

// Copies the names and sort orders so later checklist edits do not change this inspection.
function toResultRow(
  check: ActiveInspectionCheck,
  result: InspectionResultDto,
): DeepPartial<TripInspectionResult> {
  return {
    checkId: check.id,
    status: result.status,
    note: result.note ?? null,
    indicatorId: check.indicatorId,
    indicatorNameAr: check.indicator.nameAr,
    indicatorNameEn: check.indicator.nameEn,
    indicatorSortOrder: check.indicator.sortOrder,
    checkNameAr: check.nameAr,
    checkNameEn: check.nameEn,
    checkSortOrder: check.sortOrder,
  };
}
