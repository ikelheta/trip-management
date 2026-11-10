import { PartialType } from '@nestjs/swagger';
import { CreateCountryDto } from './create-country.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateCountryDto extends PartialType(CreateCountryDto, {
  skipNullProperties: false,
}) {}
