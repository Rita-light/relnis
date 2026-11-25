import { Module } from '@nestjs/common';
import { CourrielsModule } from '../courriels/courriels.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/** Authentification : inscription et vérification du courriel (connexion et sessions suivront). */
@Module({
  imports: [CourrielsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
