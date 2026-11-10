import { IsOptional, IsUUID } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export class ListVehiclesQueryDto extends BaseListQueryDto {
  /** Only return vehicles of this company. */
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
