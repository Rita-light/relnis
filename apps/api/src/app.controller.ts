import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Publique } from './auth/garde-connexion.js';

// Exemple généré par NestJS (GET /api/v1). Sera retiré quand l'API aura de vraies routes à tester.
@Publique()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
