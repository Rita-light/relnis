import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/** Authentification : inscription (connexion, sessions et mot de passe oublié suivront). */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
