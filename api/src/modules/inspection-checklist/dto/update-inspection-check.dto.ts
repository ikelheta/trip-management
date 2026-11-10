import { PartialType } from '@nestjs/swagger';
import { CreateInspectionCheckDto } from './create-inspection-check.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateInspectionCheckDto extends PartialType(
  CreateInspectionCheckDto,
  { skipNullProperties: false },
) {}
