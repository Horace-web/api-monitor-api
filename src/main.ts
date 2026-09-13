import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Monitor API')
    .setDescription('API de monitoring et de suivi de disponibilité des services.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`API Monitor server is running on http://localhost:${port}`);
  console.log(`Swagger documentation is available on http://localhost:${port}/docs`);
}

bootstrap();
