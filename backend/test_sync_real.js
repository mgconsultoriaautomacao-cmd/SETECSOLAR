const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { SolarmanService } = require('./dist/src/solarman/solarman.service');

async function testSync() {
  console.log('--- Iniciando NestJS context para testar Sincronização Real ---');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const solarmanService = app.get(SolarmanService);

  console.log('\n--- 1. Sincronizando SolisCloud ---');
  const solisRes = await solarmanService.syncSolisPlants();
  console.log('Resultado Solis:', JSON.stringify(solisRes, null, 2));

  console.log('\n--- 2. Sincronizando Solplanet ---');
  const solplanetRes = await solarmanService.syncSolplanetPlants();
  console.log('Resultado Solplanet:', JSON.stringify(solplanetRes, null, 2));

  await app.close();
  console.log('\n--- Teste concluído! ---');
}

testSync().catch(console.error);
