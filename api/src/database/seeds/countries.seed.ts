import type { DataSource } from 'typeorm';
import { Country } from '../../modules/countries/entities/country.entity.js';
import { COUNTRIES } from './data/countries.data.js';

/**
 * Inserts the countries that are not in the table yet and returns how many were added.
 * Safe to re-run: a country is skipped when its Arabic or English name already exists,
 * including soft-deleted rows, so countries removed by an admin are not brought back.
 */
export function seedCountries(dataSource: DataSource): Promise<number> {
  return dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(Country);
    const existing = await repository.find({
      select: { nameAr: true, nameEn: true },
      withDeleted: true,
    });
    const takenAr = new Set(existing.map((country) => country.nameAr));
    const takenEn = new Set(existing.map((country) => country.nameEn));

    const missing = COUNTRIES.filter(
      ({ nameAr, nameEn }) => !takenAr.has(nameAr) && !takenEn.has(nameEn),
    );
    if (missing.length > 0) {
      await repository.insert(missing.map((country) => ({ ...country })));
    }
    return missing.length;
  });
}
