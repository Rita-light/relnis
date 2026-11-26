import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ErreurApi } from '../commun/erreur-api.js';
import { RedisService } from '../redis/redis.service.js';
import {
  ChargeJetonAcces,
  cleSessionRevoquee,
  COOKIE_ACCES,
  UtilisateurConnecte,
} from './session.js';

const CLE_PUBLIQUE = 'routePublique';

/** Route accessible sans être connecté (par défaut, toutes les routes sont protégées). */
export const Publique = () => SetMetadata(CLE_PUBLIQUE, true);

/** Injecte la personne connectée dans un paramètre de contrôleur. */
export const UtilisateurCourant = createParamDecorator(
  (_: unknown, contexte: ExecutionContext): UtilisateurConnecte =>
    contexte.switchToHttp().getRequest<Request>().utilisateur!,
);

/** Garde global : toute route exige le jeton d'accès, sauf @Publique() (sécurité par défaut). */
@Injectable()
export class GardeConnexion implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(contexte: ExecutionContext) {
    const publique = this.reflector.getAllAndOverride<boolean>(CLE_PUBLIQUE, [
      contexte.getHandler(),
      contexte.getClass(),
    ]);
    if (publique) return true;

    const requete = contexte.switchToHttp().getRequest<Request>();
    const jeton: unknown = requete.cookies?.[COOKIE_ACCES];
    if (typeof jeton !== 'string') throw nonAuthentifie();

    let charge: ChargeJetonAcces;
    try {
      charge = await this.jwt.verifyAsync<ChargeJetonAcces>(jeton); // signature + expiration
    } catch {
      throw nonAuthentifie();
    }

    // Session fermée : refusée tout de suite (lecture Redis, sans la base).
    let revoquee: number;
    try {
      revoquee = await this.redis.exists(cleSessionRevoquee(charge.sid));
    } catch {
      // Redis en panne : on refuse (503).
      throw new ErreurApi(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_INDISPONIBLE',
        'Service momentanément indisponible, réessayez',
      );
    }
    if (revoquee) throw nonAuthentifie();

    requete.utilisateur = {
      id: charge.sub,
      entrepriseId: charge.ent,
      role: charge.role,
      sessionId: charge.sid,
    };
    return true;
  }
}

const nonAuthentifie = () =>
  new ErreurApi(HttpStatus.UNAUTHORIZED, 'NON_AUTHENTIFIE', 'Connexion requise');
