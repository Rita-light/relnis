import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/** Client Redis partagé : limites de débit, blocage des connexions (plus tard : la file BullMQ). */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    // Peu de nouvelles tentatives : si Redis ne répond pas, on le voit vite (santé, erreurs).
    super(config.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: 2 });
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
