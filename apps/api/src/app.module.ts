import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SanteModule } from './sante/sante.module.js';

/** Module racine : rassemble tous les modules de l'API. */
@Module({
  imports: [
    // Lit apps/api/.env et rend les variables disponibles partout.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // accès à la base (global)
    SanteModule, // GET /api/v1/sante
    AuthModule, // inscription (puis connexion, sessions…)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
