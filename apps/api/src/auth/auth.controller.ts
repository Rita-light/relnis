import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { InscriptionDto } from './dto/inscription.dto.js';
import { RenvoyerVerificationDto } from './dto/renvoyer-verification.dto.js';
import { VerifierCourrielDto } from './dto/verifier-courriel.dto.js';

/** Routes /api/v1/auth/… : reçoit les requêtes, la logique est dans AuthService. */
@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Le DTO est validé avant d'arriver ici (ValidationPipe).
  @Post('inscription')
  @ApiCreatedResponse({ description: 'Entreprise et compte administrateur créés, courriel de vérification envoyé' })
  @ApiBadRequestResponse({ description: 'DONNEES_INVALIDES' })
  @ApiConflictResponse({ description: 'COURRIEL_DEJA_UTILISE' })
  inscrire(@Body() dto: InscriptionDto) {
    return this.auth.inscrire(dto);
  }

  @Post('verifier-courriel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Courriel confirmé' })
  @ApiBadRequestResponse({ description: 'JETON_INVALIDE ou JETON_EXPIRE' })
  verifierCourriel(@Body() dto: VerifierCourrielDto) {
    return this.auth.verifierCourriel(dto.jeton);
  }

  // 202 dans tous les cas : la réponse ne dit pas si le courriel est inscrit.
  @Post('renvoyer-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Un lien est envoyé si un compte non vérifié existe' })
  async renvoyerVerification(@Body() dto: RenvoyerVerificationDto) {
    await this.auth.renvoyerVerification(dto.courriel);
  }
}
