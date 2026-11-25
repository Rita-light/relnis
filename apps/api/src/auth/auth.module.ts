import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CourrielsModule } from '../courriels/courriels.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GardeConnexion } from './garde-connexion.js';
import { DUREE_ACCES_SECONDES } from './session.js';

/** Authentification : inscription, vérification du courriel, connexion et sessions. */
@Module({
  imports: [
    CourrielsModule,
    // Signe et vérifie les jetons d'accès avec la clé secrète JWT_SECRET (jamais dans le code).
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: DUREE_ACCES_SECONDES },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Garde appliqué à TOUTES les routes de l'API ; @Publique() l'enlève.
    { provide: APP_GUARD, useClass: GardeConnexion },
  ],
})
export class AuthModule {}
