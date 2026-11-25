import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Publique } from '../auth/garde-connexion.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** GET /api/v1/sante : 200 si l'API et la base répondent, 503 sinon. */
@ApiTags('Santé')
@Publique() // interrogée par l'hébergeur et la surveillance, sans connexion
@Controller('sante')
export class SanteController {
  constructor(
    private readonly sante: HealthCheckService,
    private readonly indicateurPrisma: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  verifier() {
    return this.sante.check([
      () => this.indicateurPrisma.pingCheck('base_de_donnees', this.prisma),
    ]);
  }
}
