import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateIf, ValidateNested } from 'class-validator';
import { UpdateTripInspectionDto } from '../../trip-inspections/dto/update-trip-inspection.dto.js';
import { CreateTripDto } from './create-trip.dto.js';

// skipNullProperties: false → null is rejected for vehicleId, driverId, date, time and passengers.
// tripName/secretCode keep their own @IsOptional(), so null clears them.
export class UpdateTripDto extends PartialType(
  OmitType(CreateTripDto, ['inspection'] as const),
  { skipNullProperties: false },
) {
  /** Change inspectedAt and/or the status and note of some checks. */
  // ValidateIf instead of IsOptional: omitted is fine, null is rejected.
  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdateTripInspectionDto)
  inspection?: UpdateTripInspectionDto;
}
