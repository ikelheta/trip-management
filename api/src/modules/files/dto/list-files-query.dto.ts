import { IsString, IsUUID, Matches } from 'class-validator';
import { OWNER_TYPE_MESSAGE, OWNER_TYPE_PATTERN } from './upload-file.dto.js';

export class ListFilesQueryDto {
  @IsString()
  @Matches(OWNER_TYPE_PATTERN, { message: OWNER_TYPE_MESSAGE })
  ownerType: string;

  @IsUUID()
  ownerId: string;
}
