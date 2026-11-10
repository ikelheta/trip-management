import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateVehicleDto extends PartialType(CreateVehicleDto, {
  skipNullProperties: false,
}) {}
