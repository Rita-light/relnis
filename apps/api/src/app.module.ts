import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { FileTemplateEngine, MailModule, SmtpTransport } from '@nestjs/mail';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthModule } from './auth/auth.module.js';
import { DOSSIER_MODELES } from './courriels/dossier-modeles.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RedisService } from './redis/redis.service.js';
import { StockageLimitesRedis } from './redis/stockage-limites-redis.js';
import { SanteModule } from './sante/sante.module.js';

/** Module racine : rassemble tous les modules de l'API. */
@Module({
  imports: [
    // Lit apps/api/.env et rend les variables disponibles partout.
    ConfigModule.forRoot({ isGlobal: true }),
    // Envoi des courriels par SMTP : Mailpit en local, Brevo en changeant SMTP_URL.
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: new SmtpTransport({ url: config.getOrThrow<string>('SMTP_URL') }),
        from: config.getOrThrow<string>('COURRIEL_EXPEDITEUR'),
        // Modèles de ./courriels/modeles, enveloppés dans layout.html. Relus à chaque envoi hors production.
        templates: new FileTemplateEngine({
          dir: DOSSIER_MODELES,
          layout: 'layout',
          cache: process.env.NODE_ENV === 'production',
        }),
      }),
    }),
    PrismaModule, // accès à la base (global)
    RedisModule, // client Redis (global)
    // Limite de débit par adresse IP, compteurs dans Redis. Plus strict sur certaines routes (@Throttle).
    ThrottlerModule.forRootAsync({
      inject: [RedisService],
      useFactory: (redis: RedisService) => ({
        throttlers: [{ ttl: minutes(1), limit: 100 }], // par défaut : 100 requêtes / minute
        storage: new StockageLimitesRedis(redis),
        errorMessage: 'Trop de demandes, réessayez dans quelques minutes',
        // Tests seulement : l'en-tête x-test-sans-limite permet d'enchaîner les requêtes.
        skipIf: (contexte) =>
          process.env.NODE_ENV === 'test' &&
          contexte.switchToHttp().getRequest<Request>().headers['x-test-sans-limite'] === '1',
      }),
    }),
    SanteModule, // GET /api/v1/sante
    AuthModule, // inscription, vérification du courriel, connexion
  ],
  providers: [
    // Limite de débit appliquée à toutes les routes.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
