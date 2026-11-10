import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

const DESCRIPTIONS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid input',
  [HttpStatus.UNAUTHORIZED]: 'Not signed in, or wrong credentials',
  [HttpStatus.NOT_FOUND]: 'Resource not found',
  [HttpStatus.CONFLICT]: 'Conflicts with an existing resource',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'File exceeds the size limit',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'File type is not allowed',
};

/** Documents error responses that use the AllExceptionsFilter body. */
export function ApiErrorResponses(...statuses: HttpStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status],
        type: ErrorResponseDto,
      }),
    ),
  );
}
