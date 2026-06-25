// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global Prefix ────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Global Validation Pipe ───────────────────────────────────────────
  // whitelist: strip properties not in DTO
  // forbidNonWhitelisted: throw error if extra properties are sent
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      // eslint-disable-next-line prettier/prettier
      transform: true, 
    }),
  );

  const shouldEnableSwagger =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  if (shouldEnableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Glucofy API')
      .setDescription(
        'AI-powered sugar & nutrition intake tracking platform.\n\n' +
          '**How to authenticate:**\n' +
          '1. Register via `POST /api/v1/auth/register`\n' +
          '2. Login via `POST /api/v1/auth/login` → copy the `accessToken`\n' +
          '3. Click the **Authorize 🔒** button above and paste the token',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter your JWT Bearer token',
          in: 'header',
        },
        'JWT-auth', // This name matches @ApiBearerAuth('JWT-auth') in controllers
      )
      .setContact('Glucofy Team', '', 'dev@glucofy.com')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // remember token on page refresh
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Glucofy API Docs',
    });
  }

  // ─── Start Server ──────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n Glucofy API running on: http://localhost:${port}/api`);
  if (shouldEnableSwagger) {
    console.log(`📖 Swagger Docs:           http://localhost:${port}/docs\n`);
  }
}

void bootstrap();
