import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileTemplateEngine, MailModule, SmtpTransport } from '@nestjs/mail';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DOSSIER_MODELES } from './courriels/dossier-modeles.js';
import { PrismaModule } from './prisma/prisma.module.js';
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
    SanteModule, // GET /api/v1/sante
    AuthModule, // inscription, vérification du courriel (puis connexion…)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
