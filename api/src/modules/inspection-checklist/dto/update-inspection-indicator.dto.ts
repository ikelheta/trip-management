import { PartialType } from '@nestjs/swagger';
import { CreateInspectionIndicatorDto } from './create-inspection-indicator.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateInspectionIndicatorDto extends PartialType(
  CreateInspectionIndicatorDto,
  { skipNullProperties: false },
) {}
