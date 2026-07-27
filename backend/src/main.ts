import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: 'https://document-pipeline-nu.vercel.app',
    credentials: true,
  });
  
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Document Processing Pipeline API')
    .setDescription('The Document Processing Pipeline API description')
    .setVersion('1.0')
    .addCookieAuth('jwt')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const port = process.env.PORT ?? 3000;

  await app.listen(port, '0.0.0.0');
  Logger.log(`Application is running on port ${port}`);
}
bootstrap();
