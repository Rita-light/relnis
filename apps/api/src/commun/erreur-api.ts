import { HttpException, HttpStatus } from '@nestjs/common';

/** Erreur au format commun { code, message, details }.  */
export class ErreurApi extends HttpException {
  constructor(
    statut: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, statut);
  }
}
