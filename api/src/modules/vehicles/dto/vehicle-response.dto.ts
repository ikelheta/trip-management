import type { Vehicle } from '../entities/vehicle.entity.js';

export class VehicleResponseDto {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(vehicle: Vehicle): VehicleResponseDto {
    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      model: vehicle.model,
      type: vehicle.type,
      companyId: vehicle.companyId,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
