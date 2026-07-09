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

// Handler para o Vercel Serverless
export default async (req: any, res: any) => {
  if (!app) {
    app = await NestFactory.create(AppModule);
    app.enableCors();
    app.setGlobalPrefix('api');
    await app.init();
  }
  const server = app.getHttpAdapter().getInstance();
  return server(req, res);
};

// Inicia localmente se não estiver no Vercel
if (!process.env.VERCEL) {
  bootstrap();
}
