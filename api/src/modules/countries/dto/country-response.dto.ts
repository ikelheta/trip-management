import type { Country } from '../entities/country.entity.js';

export class CountryResponseDto {
  id: string;
  nameAr: string;
  nameEn: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(country: Country): CountryResponseDto {
    return {
      id: country.id,
      nameAr: country.nameAr,
      nameEn: country.nameEn,
      createdAt: country.createdAt,
      updatedAt: country.updatedAt,
    };
  }
}
