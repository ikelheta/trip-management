import type { Driver } from '../entities/driver.entity.js';

export class DriverResponseDto {
  id: string;
  name: string;
  identityId: string;
  nationalityId: string;
  vehicleId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(driver: Driver): DriverResponseDto {
    return {
      id: driver.id,
      name: driver.name,
      identityId: driver.identityId,
      nationalityId: driver.nationalityId,
      vehicleId: driver.vehicleId,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }
}
