import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ConnexionDto } from './dto/connexion.dto.js';
import { InscriptionDto } from './dto/inscription.dto.js';
import { RenvoyerVerificationDto } from './dto/renvoyer-verification.dto.js';
import { VerifierCourrielDto } from './dto/verifier-courriel.dto.js';
import { Publique, UtilisateurCourant } from './garde-connexion.js';
import { COOKIE_ACCES, poserCookiesSession, type UtilisateurConnecte } from './session.js';

/** Routes /api/v1/auth/… : reçoit les requêtes, la logique est dans AuthService. */
@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Le DTO est validé avant d'arriver ici (ValidationPipe).
  @Publique()
  @Post('inscription')
  @ApiCreatedResponse({ description: 'Entreprise et compte administrateur créés, courriel de vérification envoyé' })
  @ApiBadRequestResponse({ description: 'DONNEES_INVALIDES' })
  @ApiConflictResponse({ description: 'COURRIEL_DEJA_UTILISE' })
  inscrire(@Body() dto: InscriptionDto) {
    return this.auth.inscrire(dto);
  }

  @Publique()
  @Post('verifier-courriel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Courriel confirmé' })
  @ApiBadRequestResponse({ description: 'JETON_INVALIDE ou JETON_EXPIRE' })
  verifierCourriel(@Body() dto: VerifierCourrielDto) {
    return this.auth.verifierCourriel(dto.jeton);
  }

  // 202 dans tous les cas : la réponse ne dit pas si le courriel est inscrit.
  @Publique()
  @Post('renvoyer-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Un lien est envoyé si un compte non vérifié existe' })
  async renvoyerVerification(@Body() dto: RenvoyerVerificationDto) {
    await this.auth.renvoyerVerification(dto.courriel);
  }

  // Les jetons partent dans des cookies httpOnly, jamais dans le corps de la réponse.
  @Publique()
  @Post('connexion')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Connecté : cookies de session posés' })
  @ApiUnauthorizedResponse({ description: 'IDENTIFIANTS_INVALIDES' })
  @ApiForbiddenResponse({ description: 'COURRIEL_NON_VERIFIE' })
  async connecter(
    @Body() dto: ConnexionDto,
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const { jetonAcces, jetonRenouvellement, utilisateur } =
      await this.auth.connecter(dto, {
        navigateur: requete.get('user-agent'),
        adresseIp: requete.ip,
      });
    poserCookiesSession(reponse, {
      acces: jetonAcces,
      renouvellement: jetonRenouvellement,
    });
    return { utilisateur };
  }

  // Route protégée (pas de @Publique) : le garde exige le cookie d'accès.
  @Get('moi')
  @ApiCookieAuth(COOKIE_ACCES)
  @ApiOkResponse({ description: 'La personne connectée et son entreprise' })
  @ApiUnauthorizedResponse({ description: 'NON_AUTHENTIFIE' })
  moi(@UtilisateurCourant() utilisateur: UtilisateurConnecte) {
    return this.auth.moi(utilisateur.id);
  }
}
