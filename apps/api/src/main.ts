import 'dotenv/config';
import * as dns from 'dns';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// Prioritize IPv4 for cloud deployments (e.g. Render, Railway, AWS) where IPv6 routes cause ENETUNREACH
if (typeof (dns as any).setDefaultResultOrder === 'function') {
  (dns as any).setDefaultResultOrder('ipv4first');
}

async function bootstrap() {
  const logger = new Logger('CLIAS-Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    // Buffer logs until app starts
    bufferLogs: true,
    // Disable verbose NestJS startup logs in production
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
  });

  // Enable generous body size limits for Document AI and RAG PDF/file uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Security headers — dynamically import to handle both CJS and ESM exports of helmet
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const helmetModule = require('helmet');
    const helmetFn = helmetModule.default || helmetModule;
    if (typeof helmetFn === 'function') {
      app.use(helmetFn());
    }
  } catch {
    // helmet not installed or incompatible — skip silently
  }

  // Enable CORS
  const corsEnv = process.env.CORS_ORIGIN;
  const allowedOrigins = corsEnv
    ? corsEnv === '*'
      ? true
      : corsEnv.split(',').map((s) => s.trim())
    : true; // In dev/lab mode, allow all origins including mobile companion devices and local IPs

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400, // 24h preflight cache — reduces OPTIONS latency
  });

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Request validation and serialization pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || process.env.API_PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 CLIAS API Service running on port ${port}/api/v1`);
  logger.log(
    `🏫 University: ${process.env.UNIVERSITY_NAME || 'CHARUSAT'} (@${process.env.UNIVERSITY_EMAIL_DOMAIN || 'charusat.edu.in'})`,
  );
}
bootstrap().catch((err) => {
  console.error('❌ FATAL ERROR DURING SERVER STARTUP:', err);
  process.exit(1);
});
