import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class LoginResponseDto {
  /** Send as `Authorization: Bearer <accessToken>`. */
  accessToken: string;

  /** @example "Bearer" */
  tokenType: 'Bearer';

  /**
   * Seconds until the token expires.
   * @example 3600
   */
  expiresIn: number;

  user: UserResponseDto;
}
