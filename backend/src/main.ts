import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Whal-E Backend running on port ${port}`);
  console.log(`📡 API Endpoint: http://localhost:${port}`);
  console.log(`🔍 Health Check: http://localhost:${port}/health`);
}

bootstrap();
