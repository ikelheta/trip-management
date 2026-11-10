import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreatePassengerDto {
  /** @example "Sara Ahmed" */
  @Trim()
  @IsString()
  @Length(2, 256)
  name: string;

  /**
   * Digits only, sent as a string so leading zeros survive. Unique within a trip.
   * @example "1010101010"
   */
  @Trim()
  @IsString()
  @Matches(/^\d{1,50}$/, {
    message: 'identityNumber must contain 1-50 digits only',
  })
  identityNumber: string;

  /** @example "passport" */
  @Trim()
  @IsString()
  @Length(1, 50)
  docType: string;

  /** @example "Saudi Arabia" */
  @Trim()
  @IsString()
  @Length(2, 256)
  nationality: string;
}
