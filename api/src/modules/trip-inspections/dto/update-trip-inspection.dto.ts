import { PartialType } from '@nestjs/swagger';
import { CreateTripInspectionDto } from './create-trip-inspection.dto.js';

// skipNullProperties: false → null inspectedAt / results are rejected.
export class UpdateTripInspectionDto extends PartialType(
  CreateTripInspectionDto,
  { skipNullProperties: false },
) {}
