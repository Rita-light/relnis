import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configurerApp } from './configurer-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurerApp(app);
  // À l'arrêt (Ctrl + C, redéploiement), ferme proprement la connexion à la base.
  app.enableShutdownHooks();

  // Swagger : actif en développement et en préproduction, coupé en production.
  // En production, NODE_ENV vaut 'production'. La préproduction l'active avec SWAGGER_ENABLED=true.
  const swaggerActif =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (swaggerActif) {
    const config = new DocumentBuilder()
      .setTitle('API Relnis')
      .setDescription('API de gestion de stock de Relnis')
      .setVersion('1')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
