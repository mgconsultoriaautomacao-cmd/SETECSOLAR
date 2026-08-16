import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let app: any;

async function bootstrap() {
  app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

async function getApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, { cors: true });
    app.setGlobalPrefix('api');
    await app.init();
  }
  return app;
}

// Handler para o Vercel Serverless
export default async (req: any, res: any) => {
  try {
    const instance = await getApp();
    const server = instance.getHttpAdapter().getInstance();

    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }

    return server(req, res);
  } catch (err: any) {
    console.error('Error in Vercel Serverless Function:', err);
    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: 'Internal Server Error',
        error: err.message || String(err),
      });
    }
  }
};

// Inicia localmente se não estiver no Vercel
if (!process.env.VERCEL) {
  bootstrap();
}
