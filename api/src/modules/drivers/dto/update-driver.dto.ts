import { PartialType } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateDriverDto extends PartialType(CreateDriverDto, {
  skipNullProperties: false,
}) {}
