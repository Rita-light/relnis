import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SanteModule } from './sante/sante.module.js';

@Module({
  imports: [
    // Lit apps/api/.env et rend les variables disponibles partout.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SanteModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
