import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCountryDto {
  /**
   * Arabic name. Unique among non-deleted countries.
   * @example "المملكة العربية السعودية"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameAr: string;

  /**
   * English name. Unique among non-deleted countries.
   * @example "Saudi Arabia"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameEn: string;
}
