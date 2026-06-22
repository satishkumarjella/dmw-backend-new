import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BlobServiceClient } from '@azure/storage-blob';

async function configureAzureBlobCors(connectionString: string) {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const allowedOrigins = [
      'http://172.190.109.60',
      'http://dmw-projects-rfq.dmwcc.com',
      'https://dmw-projects-rfq.dmwcc.com',
      'http://172.212.106.192',
      'http://172.212.106.192:4200',
      'http://localhost:4200',
      'http://localhost',
      'http://127.0.0.1',
      'https://your-prod-frontend-domain.com'
    ];
    await blobServiceClient.setProperties({
      cors: [
        {
          allowedOrigins: allowedOrigins.join(','),
          allowedMethods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
          allowedHeaders: '*',
          exposedHeaders: '*',
          maxAgeInSeconds: 86400,
        },
      ],
    });
    console.log('Azure Blob Storage CORS configured successfully.');
  } catch (error: any) {
    console.warn('Could not configure Azure Blob Storage CORS:', error.message);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://172.190.109.60',
      'http://dmw-projects-rfq.dmwcc.com',
      'https://dmw-projects-rfq.dmwcc.com',
      'http://172.212.106.192',
      'http://172.212.106.192:4200',
      'https://your-prod-frontend-domain.com'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Origin, X-Requested-With, X-Access-Token',
    credentials: true,
  });

  const connectionString = process.env.BLOB_CONNECTION_STRING;
  if (connectionString) {
    await configureAzureBlobCors(connectionString);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
