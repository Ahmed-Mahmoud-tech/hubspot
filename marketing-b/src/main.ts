import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS with dynamic origin check
  const allowedOrigins = [
    'http://localhost:3000',
    'https://clearroot.cloud',
    'http://clearroot.cloud',
    frontendUrl,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      console.log(`CORS request from origin: ${origin}`);
      console.log(`Allowed origins:`, allowedOrigins);
      
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        console.log('Allowing request with no origin');
        callback(null, true);
        return;
      }
      
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.log(`❌ CORS BLOCKED origin: ${origin}`);
        console.log(`This origin is not in allowedOrigins list`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.APP_PORT || 8000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
