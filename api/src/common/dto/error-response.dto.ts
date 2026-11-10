import { ApiProperty } from '@nestjs/swagger';

/** Body of every error response (see AllExceptionsFilter). */
export class ErrorResponseDto {
  /** @example 400 */
  statusCode: number;

  /** @example "Bad Request" */
  error: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'A message, or the list of validation messages.',
    example: ['name must be longer than or equal to 2 characters'],
  })
  message: string | string[];

  /** @example "/api/companies" */
  path: string;

  /** @example "2026-10-31T12:00:00.000Z" */
  timestamp: string;
}
