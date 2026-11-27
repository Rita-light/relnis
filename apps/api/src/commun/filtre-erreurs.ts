import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErreurApi } from './erreur-api.js';

const CODES_PAR_STATUT: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'REQUETE_INVALIDE',
  [HttpStatus.UNAUTHORIZED]: 'NON_AUTHENTIFIE',
  [HttpStatus.FORBIDDEN]: 'ACCES_REFUSE',
  [HttpStatus.NOT_FOUND]: 'INTROUVABLE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TROP_DE_DEMANDES',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_INDISPONIBLE',
};

/** Toutes les erreurs sortent au format { code, message, details }. */
@Catch()
export class FiltreErreurs implements ExceptionFilter {
  private readonly logger = new Logger(FiltreErreurs.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const reponse = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ErreurApi) {
      reponse.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof HttpException) {
      const statut = exception.getStatus();
      const corps = exception.getResponse();
      // Garde le détail utile (ex. adresse de santé), pas le corps par défaut de NestJS.
      const details =
        typeof corps === 'object' && !('statusCode' in corps)
          ? corps
          : undefined;
      reponse.status(statut).json({
        code: CODES_PAR_STATUT[statut] ?? 'ERREUR_HTTP',
        message: exception.message,
        details,
      });
      return;
    }

    // Erreur imprévue : journalisée ici, sans aucun détail technique pour le client.
    this.logger.error(exception);
    reponse.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'ERREUR_INTERNE',
      message: 'Erreur interne du serveur',
    });
  }
}
