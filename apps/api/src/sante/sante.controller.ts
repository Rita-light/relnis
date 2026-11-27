import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Publique } from '../auth/garde-connexion.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

/** GET /api/v1/sante : 200 si l'API, la base et Redis répondent, 503 sinon. */
@ApiTags('Santé')
@Publique() // interrogée par l'hébergeur et la surveillance, sans connexion
@Controller('sante')
export class SanteController {
  constructor(
    private readonly sante: HealthCheckService,
    private readonly indicateurPrisma: PrismaHealthIndicator,
    private readonly indicateurs: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  verifier() {
    return this.sante.check([
      () => this.indicateurPrisma.pingCheck('base_de_donnees', this.prisma),
      // Redis est « en panne » s'il ne répond pas à PING en moins d'une seconde.
      () =>
        this.indicateurs
          .check('redis')
          .attempt(async () => {
            await this.redis.ping();
          })
          .withTimeout(1000),
    ]);
  }
}
