import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min, ValidateIf } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateInspectionIndicatorDto {
  /**
   * Arabic name. Unique among non-deleted indicators.
   * @example "فحص مؤشرات لوحة القيادة"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameAr: string;

  /**
   * English name. Unique among non-deleted indicators.
   * @example "Dashboard Indicators"
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
