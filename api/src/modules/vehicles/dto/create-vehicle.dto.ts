import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateVehicleDto {
  /**
   * Unique among non-deleted vehicles.
   * @example "ABC 1234"
   */
  @Trim()
  @IsString()
  @Length(1, 50)
  plateNumber: string;

  /** @example "Toyota Hiace 2024" */
  @Trim()
  @IsString()
  @Length(1, 256)
  model: string;

  /** @example "Bus" */
  @Trim()
  @IsString()
  @Length(1, 256)
  type: string;

  /**
   * Id of an existing (non-deleted) company.
   * @example "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"
   */
  @IsUUID()
  companyId: string;
}
