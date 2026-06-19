import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Add API prefix so routes like /api/auth/login map to controllers
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
