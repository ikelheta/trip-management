import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCompanyDto {
  /** @example "Azm Leasing" */
  @Trim()
  @IsString()
  @Length(2, 256)
  name: string;

  /**
   * Unique among non-deleted companies.
   * @example "CR-1010"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  registrationNumber: string;

  /** @example "Riyadh" */
  @Trim()
  @IsString()
  @Length(2, 256)
  city: string;

  /** @example "King Fahd Rd" */
  @Trim()
  @IsString()
  @Length(2, 256)
  address: string;

  /** @example "+966500000000" */
  @Trim()
  @IsString()
  @Length(2, 256)
  whatsAppNumber: string;

  /** @example "+966110000000" */
  @Trim()
  @IsString()
  @Length(2, 256)
  phoneNumber: string;

  /**
   * `url` returned by POST /api/files (ownerType "companies", JPEG/PNG/WebP). Null clears the image on update.
   * @example "/api/files/3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b/download"
   */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  headerUrl?: string | null;

  /**
   * `url` returned by POST /api/files (ownerType "companies", JPEG/PNG/WebP). Null clears the image on update.
   * @example "/api/files/7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d/download"
   */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  footerUrl?: string | null;
}
