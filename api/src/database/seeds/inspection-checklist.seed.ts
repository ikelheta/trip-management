import type { DataSource } from 'typeorm';
import { InspectionCheck } from '../../modules/inspection-checklist/entities/inspection-check.entity.js';
import { InspectionIndicator } from '../../modules/inspection-checklist/entities/inspection-indicator.entity.js';
import { INSPECTION_CHECKLIST } from './data/inspection-checklist.data.js';

/**
 * Inserts the default indicators, each with its checks, and returns how many indicators were added.
 * Safe to re-run: an indicator (and its checks) is skipped when its Arabic or English name already
 * exists, including soft-deleted rows, so an admin's changes and deletions are kept.
 */
export function seedInspectionChecklist(
  dataSource: DataSource,
): Promise<number> {
  return dataSource.transaction(async (manager) => {
    const indicators = manager.getRepository(InspectionIndicator);
    const checks = manager.getRepository(InspectionCheck);
    const existing = await indicators.find({
      select: { nameAr: true, nameEn: true },
      withDeleted: true,
    });
    const takenAr = new Set(existing.map((indicator) => indicator.nameAr));
    const takenEn = new Set(existing.map((indicator) => indicator.nameEn));

    const missing = INSPECTION_CHECKLIST.filter(
      ({ nameAr, nameEn }) => !takenAr.has(nameAr) && !takenEn.has(nameEn),
    );
    for (const { checks: checkSeeds, ...indicatorSeed } of missing) {
      const indicator = await indicators.save(indicators.create(indicatorSeed));
      await checks.insert(
        checkSeeds.map((check) => ({ ...check, indicatorId: indicator.id })),
      );
    }
    return missing.length;
  });
}
