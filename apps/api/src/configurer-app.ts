import { INestApplication, VersioningType } from '@nestjs/common';

/**
 * Réglages communs à l'application (main.ts) et aux tests de bout en bout.
 * Les deux appellent cette fonction : les tests vérifient donc la vraie API.
 */
export function configurerApp(app: INestApplication): void {
  // Toutes les adresses commencent par /api/v1.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
}
