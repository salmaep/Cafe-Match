/**
 * CLI: drain the meili_sync_failures retry queue.
 * Usage: npm run meili:resync-failed
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MeiliCafesService } from '../meili-cafes.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const meiliCafes = app.get(MeiliCafesService);

  console.log('Draining meili_sync_failures queue...');
  const { processed, failed } = await meiliCafes.resyncFailed();
  console.log(`Done: ${processed} synced, ${failed} still failing.`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Resync failed:', err);
  process.exit(1);
});
