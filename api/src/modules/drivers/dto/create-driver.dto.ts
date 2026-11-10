import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateDriverDto {
  /** @example "Mohammed Ali" */
  @Trim()
  @IsString()
  @Length(2, 256)
  name: string;

  /**
   * National ID or iqama number. Unique among non-deleted drivers.
   * @example "1010101010"
   */
  @Trim()
  @IsString()
  @Length(1, 50)
  identityId: string;

  /**
   * Id of an existing (non-deleted) country.
   * @example "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"
   */
  @IsUUID()
  nationalityId: string;

  /**
   * Id of an existing (non-deleted) vehicle.
   * @example "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d"
   */
  @IsUUID()
  vehicleId: string;
}
