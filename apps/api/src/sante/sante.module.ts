import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SanteController } from './sante.controller.js';

/** Adresse de santé, avec Terminus (vérifications de santé officielles de NestJS). */
@Module({
  imports: [TerminusModule],
  controllers: [SanteController],
})
export class SanteModule {}
