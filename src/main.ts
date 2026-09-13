import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Monitor API')
    .setDescription('API de monitoring et de suivi de disponibilité des services.')
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API Monitor server is running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation is available on http://localhost:${port}/docs`);
}

bootstrap();
