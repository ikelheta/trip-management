import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateInspectionCheckDto {
  /**
   * Id of an existing (non-deleted) indicator.
   * @example "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"
   */
  @IsUUID()
  indicatorId: string;

  /**
   * Arabic name. Unique within the indicator.
   * @example "مؤشر الوقود"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameAr: string;

  /**
   * English name. Unique within the indicator.
   * @example "Fuel gauge"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameEn: string;

  /**
   * Lower comes first. Defaults to 0.
   * @example 1
   */
  // ValidateIf instead of IsOptional: omitted is fine, null is rejected (NOT NULL column).
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
