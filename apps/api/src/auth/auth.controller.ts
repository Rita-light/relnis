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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ConnexionDto } from './dto/connexion.dto.js';
import { InscriptionDto } from './dto/inscription.dto.js';
import { MotDePasseOublieDto } from './dto/mot-de-passe-oublie.dto.js';
import { NouveauMotDePasseDto } from './dto/nouveau-mot-de-passe.dto.js';
import { RenvoyerVerificationDto } from './dto/renvoyer-verification.dto.js';
import { VerifierCourrielDto } from './dto/verifier-courriel.dto.js';
import { Publique, UtilisateurCourant } from './garde-connexion.js';
import {
  COOKIE_ACCES,
  COOKIE_RENOUVELLEMENT,
  effacerCookiesSession,
  poserCookiesSession,
  type UtilisateurConnecte,
} from './session.js';

/** La valeur d'un cookie de la requête, si c'est bien du texte. */
const cookie = (requete: Request, nom: string): string | undefined => {
  const valeur: unknown = requete.cookies?.[nom];
  return typeof valeur === 'string' ? valeur : undefined;
};

/**
 * Routes /api/v1/auth/… : reçoit les requêtes, la logique est dans AuthService.
 * @Throttle : limites par adresse IP, plus strictes que celle de toute l'API (429 TROP_DE_DEMANDES).
 */
@ApiTags('Authentification')
@ApiTooManyRequestsResponse({ description: 'TROP_DE_DEMANDES' })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Le DTO est validé avant d'arriver ici (ValidationPipe).
  @Publique()
  @Throttle({ default: { limit: 5, ttl: minutes(15) } }) // chaque inscription envoie un courriel
  @Post('inscription')
  @ApiCreatedResponse({ description: 'Entreprise et compte administrateur créés, courriel de vérification envoyé' })
  @ApiBadRequestResponse({ description: 'DONNEES_INVALIDES' })
  @ApiConflictResponse({ description: 'COURRIEL_DEJA_UTILISE' })
  inscrire(@Body() dto: InscriptionDto) {
    return this.auth.inscrire(dto);
  }

  @Publique()
  @Throttle({ default: { limit: 10, ttl: minutes(1) } }) // empêche d'essayer des jetons en rafale
  @Post('verifier-courriel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Courriel confirmé' })
  @ApiBadRequestResponse({ description: 'JETON_INVALIDE ou JETON_EXPIRE' })
  verifierCourriel(@Body() dto: VerifierCourrielDto) {
    return this.auth.verifierCourriel(dto.jeton);
  }

  // 202 dans tous les cas : la réponse ne dit pas si le courriel est inscrit.
  @Publique()
  @Throttle({ default: { limit: 3, ttl: minutes(15) } }) // empêche d'inonder une boîte de courriels
  @Post('renvoyer-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Un lien est envoyé si un compte non vérifié existe' })
  async renvoyerVerification(@Body() dto: RenvoyerVerificationDto) {
    await this.auth.renvoyerVerification(dto.courriel);
  }

  // Les jetons partent dans des cookies httpOnly, jamais dans le corps de la réponse.
  @Publique()
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
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

  // Publique : appelée justement quand le jeton d'accès a expiré. Elle lit le cookie de renouvellement.
  @Publique()
  @Throttle({ default: { limit: 30, ttl: minutes(1) } })
  @Post('renouveler')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Nouveau jeton d'accès (et nouveau jeton de renouvellement) en cookies" })
  @ApiUnauthorizedResponse({ description: 'SESSION_INVALIDE : se reconnecter' })
  async renouveler(
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    try {
      const { jetonAcces, jetonRenouvellement } = await this.auth.renouveler(
        cookie(requete, COOKIE_RENOUVELLEMENT),
      );
      poserCookiesSession(reponse, {
        acces: jetonAcces,
        renouvellement: jetonRenouvellement,
      });
    } catch (erreur) {
      // Session refusée : on efface les cookies, devenus inutiles.
      effacerCookiesSession(reponse);
      throw erreur;
    }
  }

  // Publique : on doit pouvoir se déconnecter même avec un jeton d'accès expiré.
  @Publique()
  @Post('deconnexion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Session fermée, cookies effacés' })
  async deconnecter(
    @Req() requete: Request,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    await this.auth.deconnecter(cookie(requete, COOKIE_RENOUVELLEMENT));
    effacerCookiesSession(reponse);
  }

  // 202 dans tous les cas : la réponse ne dit pas si le courriel est inscrit.
  @Publique()
  @Throttle({ default: { limit: 3, ttl: minutes(15) } }) // empêche d'inonder une boîte de courriels
  @Post('mot-de-passe-oublie')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Un lien est envoyé si un compte actif existe' })
  async demanderReinitialisation(@Body() dto: MotDePasseOublieDto) {
    await this.auth.demanderReinitialisation(dto.courriel);
  }

  @Publique()
  @Throttle({ default: { limit: 10, ttl: minutes(1) } }) // empêche d'essayer des jetons en rafale
  @Post('nouveau-mot-de-passe')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Mot de passe changé, toutes les sessions fermées : se reconnecter' })
  @ApiBadRequestResponse({ description: 'JETON_INVALIDE, JETON_EXPIRE ou DONNEES_INVALIDES' })
  async reinitialiserMotDePasse(
    @Body() dto: NouveauMotDePasseDto,
    @Res({ passthrough: true }) reponse: Response,
  ) {
    const resultat = await this.auth.reinitialiserMotDePasse(
      dto.jeton,
      dto.motDePasse,
    );
    // Les sessions sont fermées : on efface aussi les cookies de ce navigateur.
    effacerCookiesSession(reponse);
    return resultat;
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
