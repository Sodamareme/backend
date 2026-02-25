import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // ===============================
  // ✅ CORS PRODUCTION SAFE
  // ===============================
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://gestionecoleodc.com',
    'https://www.gestionecoleodc.com',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Autoriser requêtes serveur → serveur (Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked by CORS: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ===============================
  // ✅ Payload limit
  // ===============================
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // ===============================
  // ✅ Global Validation
  // ===============================
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // ===============================
  // ✅ Swagger (dev only)
  // ===============================
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Sonatel Academy API')
      .setDescription('API de gestion')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // ===============================
  // ✅ CAPROVER SAFE PORT
  // ===============================
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Server running on http://0.0.0.0:${port}`);
}

bootstrap();