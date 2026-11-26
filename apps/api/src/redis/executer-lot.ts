import { HttpStatus } from '@nestjs/common';
import type { ChainableCommander } from 'ioredis';
import { ErreurApi } from '../commun/erreur-api.js';

/** Exécute un lot Redis (multi) ; 503 si une seule commande échoue (exec() ne le signale pas). */
export async function executerLot(lot: ChainableCommander) {
  const resultats = await lot.exec();
  if (!resultats || resultats.some(([erreur]) => erreur)) {
    throw new ErreurApi(
      HttpStatus.SERVICE_UNAVAILABLE,
      'SERVICE_INDISPONIBLE',
      'Service momentanément indisponible, réessayez',
    );
  }
  return resultats.map(([, valeur]) => valeur);
}
