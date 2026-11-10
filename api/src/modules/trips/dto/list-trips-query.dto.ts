import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';
import { DATE_PATTERN } from './create-trip.dto.js';

export class ListTripsQueryDto extends BaseListQueryDto {
  /** Only return trips that use this vehicle. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  /** Only return trips driven by this driver. */
  @IsOptional()
  @IsUUID()
  driverId?: string;

  /** Only return trips on or after this date, "YYYY-MM-DD". */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'dateFrom must be in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'dateFrom must be a valid date' })
  dateFrom?: string;

  /** Only return trips on or before this date, "YYYY-MM-DD". */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'dateTo must be in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'dateTo must be a valid date' })
  dateTo?: string;
}
