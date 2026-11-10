import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { NodeEnv, type EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { exposeUnsetFields: false },
    }),
  );
  app.enableShutdownHooks();

  const config: ConfigService<EnvironmentVariables, true> =
    app.get(ConfigService);

  // Swagger UI at /api/docs, OpenAPI JSON at /api/docs-json. Not served in production.
  if (config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Trip Management API')
        .setDescription(
          'Small leasing companies manage their vehicles, drivers and trips.',
        )
        .setVersion('0.0.1')
        .addBearerAuth()
        .addSecurityRequirements('bearer')
        .addGlobalResponse({
          status: HttpStatus.UNAUTHORIZED,
          description: 'Missing, invalid or expired access token',
        })
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
