import {
  HttpStatus,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ErreurApi } from './commun/erreur-api.js';
import { FiltreErreurs } from './commun/filtre-erreurs.js';

/**
 * Réglages communs à l'application (main.ts) et aux tests de bout en bout.
 * Les deux appellent cette fonction : les tests vérifient donc la vraie API.
 */
export function configurerApp(app: INestApplication): void {
  // En-têtes de sécurité sur toutes les réponses (ceux de Helmet), et plus de X-Powered-By.
  app.useSecurityHeaders();
  // CSRF : refuse (403) une requête qui modifie des données si elle vient d'un autre site.
  // Le navigateur l'indique lui-même (en-têtes Sec-Fetch-Site et Origin).
  app.enableCsrfProtection();

  // Toutes les adresses commencent par /api/v1.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Lit les cookies des requêtes (requete.cookies), dont celui du jeton d'accès.
  app.use(cookieParser());

  // Toute donnée reçue est vérifiée par son DTO avant d'arriver au contrôleur.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // retire les champs non prévus par le DTO…
      forbidNonWhitelisted: true, // …et refuse la requête s'il y en a
      transform: true,
      exceptionFactory: (erreurs) =>
        new ErreurApi(
          HttpStatus.BAD_REQUEST,
          'DONNEES_INVALIDES',
          'Données invalides',
          {
            // ex. { courriel: ['isEmail'], motDePasse: ['minLength'] }
            champs: Object.fromEntries(
              erreurs.map((e) => [
                e.property,
                Object.keys(e.constraints ?? {}),
              ]),
            ),
          },
        ),
    }),
  );

  app.useGlobalFilters(new FiltreErreurs());
}
