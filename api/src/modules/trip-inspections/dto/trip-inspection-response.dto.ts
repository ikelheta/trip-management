import type { TripInspection } from '../entities/trip-inspection.entity.js';

export class InspectionCheckResultDto {
  checkId: string;
  nameAr: string;
  nameEn: string;
  /** true = good. */
  status: boolean;
  note: string | null;
}

export class InspectionIndicatorResultDto {
  indicatorId: string;
  nameAr: string;
  nameEn: string;
  /** Every check of this indicator is good. */
  passed: boolean;
  checks: InspectionCheckResultDto[];
}

export class TripInspectionResponseDto {
  id: string;
  tripId: string;
  inspectedAt: Date;
  /** Every check is good. */
  passed: boolean;
  failedCount: number;
  /** Grouped and ordered by the snapshot taken at inspection time. */
  indicators: InspectionIndicatorResultDto[];
  createdAt: Date;
  updatedAt: Date;

  // The service always loads results with the inspection.
  static fromEntity(inspection: TripInspection): TripInspectionResponseDto {
    const results = [...(inspection.results ?? [])].sort(
      (a, b) =>
        a.indicatorSortOrder - b.indicatorSortOrder ||
        a.indicatorNameEn.localeCompare(b.indicatorNameEn) ||
        a.checkSortOrder - b.checkSortOrder ||
        a.checkNameEn.localeCompare(b.checkNameEn),
    );

    // A Map keeps insertion order, so indicators come out in the sorted order.
    const indicators = new Map<string, InspectionIndicatorResultDto>();
    for (const result of results) {
      let indicator = indicators.get(result.indicatorId);
      if (!indicator) {
        indicator = {
          indicatorId: result.indicatorId,
          nameAr: result.indicatorNameAr,
          nameEn: result.indicatorNameEn,
          passed: true,
          checks: [],
        };
        indicators.set(result.indicatorId, indicator);
      }
      indicator.passed &&= result.status;
      indicator.checks.push({
        checkId: result.checkId,
        nameAr: result.checkNameAr,
        nameEn: result.checkNameEn,
        status: result.status,
        note: result.note,
      });
    }

    const failedCount = results.filter((result) => !result.status).length;
    return {
      id: inspection.id,
      tripId: inspection.tripId,
      inspectedAt: inspection.inspectedAt,
      passed: failedCount === 0,
      failedCount,
      indicators: [...indicators.values()],
      createdAt: inspection.createdAt,
      updatedAt: inspection.updatedAt,
    };
  }
}
