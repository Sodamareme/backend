import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // ✅ CORS PRODUCTION + DEV SAFE
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://gestionecoleodc.com',
    'https://www.gestionecoleodc.com'
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman / server-to-server

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ✅ Payload limit
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // ✅ Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // ✅ Swagger (désactivé en prod si tu veux)
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

  // ✅ IMPORTANT pour CapRover
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application running on port: ${port}`);
}

bootstrap();
