import type { InspectionCheck } from '../entities/inspection-check.entity.js';

export class InspectionCheckResponseDto {
  id: string;
  indicatorId: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(check: InspectionCheck): InspectionCheckResponseDto {
    return {
      id: check.id,
      indicatorId: check.indicatorId,
      nameAr: check.nameAr,
      nameEn: check.nameEn,
      sortOrder: check.sortOrder,
      createdAt: check.createdAt,
      updatedAt: check.updatedAt,
    };
  }
}
