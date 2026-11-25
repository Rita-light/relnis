import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { InscriptionDto } from './dto/inscription.dto.js';

/** Routes /api/v1/auth/… : reçoit les requêtes, la logique est dans AuthService. */
@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Le DTO est validé avant d'arriver ici (ValidationPipe).
  @Post('inscription')
  @ApiCreatedResponse({ description: 'Entreprise et compte administrateur créés' })
  @ApiBadRequestResponse({ description: 'DONNEES_INVALIDES' })
  @ApiConflictResponse({ description: 'COURRIEL_DEJA_UTILISE' })
  inscrire(@Body() dto: InscriptionDto) {
    return this.auth.inscrire(dto);
  }
}
