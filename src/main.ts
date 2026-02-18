import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // ✅ CORS PRODUCTION + DEV
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://gestionecoleodc.com',          // frontend prod
      'https://www.gestionecoleodc.com'
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ✅ Payload size (upload images)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // ✅ Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // ✅ Swagger (désactivable en prod si tu veux plus de sécurité)
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
