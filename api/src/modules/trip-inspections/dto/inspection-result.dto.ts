import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class InspectionResultDto {
  /**
   * Id of a live inspection check (see GET /inspection-indicators).
   * @example "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f"
   */
  @IsUUID()
  checkId: string;

  /**
   * true = good, false = not good.
   * @example true
   */
  @IsBoolean()
  status: boolean;

  /**
   * Optional; omitted or null means no note.
   * @example "Front left tire pressure is low"
   */
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 500)
  note?: string | null;
}
