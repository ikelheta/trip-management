import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export const OWNER_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,49}$/;
export const OWNER_TYPE_MESSAGE =
  'ownerType must be 1-50 lowercase letters, digits or dashes, starting with a letter';

export class UploadFileDto {
  // Owning module's name, e.g. "users", "trips", "trip-bookings".
  @IsString()
  @Matches(OWNER_TYPE_PATTERN, { message: OWNER_TYPE_MESSAGE })
  ownerType: string;

  // Omit when the owner does not exist yet; the owning module links it later.
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
