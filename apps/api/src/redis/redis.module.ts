import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';

// Global : un seul client Redis pour toute l'API, injectable partout.
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
