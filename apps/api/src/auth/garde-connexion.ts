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
import {
  ChargeJetonAcces,
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

/**
 * Garde global : vérifie le jeton d'accès (cookie) sur chaque requête, sauf @Publique().
 * Sécurité par défaut : une nouvelle route oubliée est protégée, pas ouverte.
 */
@Injectable()
export class GardeConnexion implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
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

    try {
      // Vérifie la signature et l'expiration, sans lire la base : c'est ce qui rend le JWT rapide.
      const charge = await this.jwt.verifyAsync<ChargeJetonAcces>(jeton);
      requete.utilisateur = {
        id: charge.sub,
        entrepriseId: charge.ent,
        role: charge.role,
        sessionId: charge.sid,
      };
      return true;
    } catch {
      throw nonAuthentifie();
    }
  }
}

const nonAuthentifie = () =>
  new ErreurApi(HttpStatus.UNAUTHORIZED, 'NON_AUTHENTIFIE', 'Connexion requise');
