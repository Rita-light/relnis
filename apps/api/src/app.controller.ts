import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

// Exemple généré par NestJS (GET /api/v1). Sera retiré quand l'API aura de vraies routes à tester.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
