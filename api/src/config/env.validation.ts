import { plainToInstance, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsMimeType,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
}

export enum StorageDriver {
  Local = 'local',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  // Implicit conversion turns "false" into true, so read the raw value.
  @Transform(({ obj }) => obj.DB_LOGGING === true || obj.DB_LOGGING === 'true')
  @IsBoolean()
  DB_LOGGING: boolean = false;

  @IsEnum(StorageDriver)
  STORAGE_DRIVER: StorageDriver = StorageDriver.Local;

  @IsString()
  @IsNotEmpty()
  STORAGE_LOCAL_PATH: string = './storage';

  @IsInt()
  @Min(1)
  @Max(100)
  FILE_MAX_SIZE_MB: number = 10;

  // Comma-separated list; read the raw value (implicit conversion does not split strings).
  @Transform(({ obj }) =>
    typeof obj.FILE_ALLOWED_MIME_TYPES === 'string'
      ? obj.FILE_ALLOWED_MIME_TYPES.split(',')
          .map((type: string) => type.trim().toLowerCase())
          .filter((type: string) => type !== '')
      : obj.FILE_ALLOWED_MIME_TYPES,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsMimeType({ each: true })
  FILE_ALLOWED_MIME_TYPES: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  // Trip QR codes encode `${TRIP_QR_BASE_URL}/${trip.id}`. require_tld: false allows localhost.
  @IsUrl({ require_tld: false, require_protocol: true })
  TRIP_QR_BASE_URL: string = 'http://localhost:3000/api/trips';

  // HS256 key for access tokens. Use a long random value (e.g. `openssl rand -base64 48`).
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  JWT_EXPIRES_IN_SECONDS: number = 3600;

  // Optional: `npm run seed` creates this admin when the email is not taken yet.
  @IsOptional()
  @IsEmail()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  SEED_ADMIN_PASSWORD?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return env;
}
