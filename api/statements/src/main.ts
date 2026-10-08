import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG, type Config } from './config/config';
import { ErrorFilter } from './errors/error.filter';
import { JsonLogger } from './telemetry/json-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger(), bodyParser: false });
  const config = app.get<Config>(CONFIG);

  // CORS contract (engineering.md): exact allowlist, no credentials,
  // Upload-Ticket is the only auth header this service reads.
  app.enableCors({
    origin: config.corsOrigins,
    credentials: false,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Upload-Ticket'],
    maxAge: 600,
  });
  app.useGlobalFilters(new ErrorFilter());
  app.enableShutdownHooks();

  await app.listen(config.port);
}

bootstrap();
