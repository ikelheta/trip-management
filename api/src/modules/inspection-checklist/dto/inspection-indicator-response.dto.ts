import type { InspectionIndicator } from '../entities/inspection-indicator.entity.js';
import { InspectionCheckResponseDto } from './inspection-check-response.dto.js';

export class InspectionIndicatorResponseDto {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  /** Live checks, sorted by sortOrder then nameEn. */
  checks: InspectionCheckResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  // The service always loads checks with the indicator.
  static fromEntity(
    indicator: InspectionIndicator,
  ): InspectionIndicatorResponseDto {
    return {
      id: indicator.id,
      nameAr: indicator.nameAr,
      nameEn: indicator.nameEn,
      sortOrder: indicator.sortOrder,
      checks: (indicator.checks ?? [])
        .map(InspectionCheckResponseDto.fromEntity)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn),
        ),
      createdAt: indicator.createdAt,
      updatedAt: indicator.updatedAt,
    };
  }
}
