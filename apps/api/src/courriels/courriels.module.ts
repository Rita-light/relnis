import { Module } from '@nestjs/common';
import { CourrielsService } from './courriels.service.js';

/** Contenu des courriels. L'envoi lui-même (transport) est réglé dans app.module.ts. */
@Module({
  providers: [CourrielsService],
  exports: [CourrielsService],
})
export class CourrielsModule {}
