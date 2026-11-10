import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** @example "admin@example.com" */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** @example "ChangeMe123!" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
