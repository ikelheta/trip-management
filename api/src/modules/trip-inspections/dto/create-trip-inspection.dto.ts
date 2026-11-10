import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsISO8601,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { InspectionResultDto } from './inspection-result.dto.js';

const MAX_RESULTS = 200;

export class CreateTripInspectionDto {
  /**
   * When the inspection was done (ISO 8601, include the offset). Defaults to now.
   * @example "2026-11-15T07:45:00+03:00"
   */
  // ValidateIf instead of IsOptional: omitted is fine, null is rejected.
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  inspectedAt?: string;

  /**
   * Create: one result for every live check. Update: only the checks to change.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_RESULTS)
  @ArrayUnique((result?: InspectionResultDto) => result?.checkId, {
    message: 'results must not repeat a checkId',
  })
  @ValidateNested({ each: true })
  @Type(() => InspectionResultDto)
  results: InspectionResultDto[];
}
