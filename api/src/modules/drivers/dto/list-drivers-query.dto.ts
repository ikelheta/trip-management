import { IsOptional, IsUUID } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export class ListDriversQueryDto extends BaseListQueryDto {
  /** Only return drivers of this nationality. */
  @IsOptional()
  @IsUUID()
  nationalityId?: string;

  /** Only return drivers assigned to this vehicle. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
