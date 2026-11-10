import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateTripInspectionDto } from '../../trip-inspections/dto/create-trip-inspection.dto.js';
import { CreatePassengerDto } from './create-passenger.dto.js';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MAX_PASSENGERS = 100;

export class CreateTripDto {
  /** @example "Riyadh to Jeddah — morning" */
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 256)
  tripName?: string | null;

  /** @example "A7K29Q" */
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 50)
  secretCode?: string | null;

  /**
   * Id of an existing (non-deleted) vehicle.
   * @example "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d"
   */
  @IsUUID()
  vehicleId: string;

  /**
   * Id of an existing (non-deleted) driver.
   * @example "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e"
   */
  @IsUUID()
  driverId: string;

  /**
   * Trip date, "YYYY-MM-DD".
   * @example "2026-11-15"
   */
  @IsString()
  @Matches(DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'date must be a valid date' })
  date: string;

  /**
   * 24h "HH:mm" or "HH:mm:ss". Responses always use "HH:mm:ss".
   * @example "08:30"
   */
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'time must be in HH:mm or HH:mm:ss format (24h)',
  })
  time: string;

  /**
   * Where the trip starts. Free text, trimmed.
   * @example "Riyadh"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  origin: string;

  /**
   * Where the trip ends. Free text, trimmed.
   * @example "Jeddah"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  destination: string;

  /**
   * Omit for none. On update, this list replaces all existing passengers; [] clears them.
   */
  // ValidateIf instead of IsOptional: omitted is fine, null is rejected.
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(MAX_PASSENGERS)
  @ArrayUnique((passenger?: CreatePassengerDto) => passenger?.identityNumber, {
    message: 'passengers must not repeat an identityNumber',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePassengerDto)
  passengers?: CreatePassengerDto[];

  /**
   * Pre-trip inspection: one result for every live check (see GET /inspection-indicators).
   */
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateTripInspectionDto)
  inspection: CreateTripInspectionDto;
}
