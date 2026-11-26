import { createHash } from 'node:crypto';

/**
 * Haché d'un jeton (courriel, renouvellement). SHA-256 suffit ici : le jeton est long
 * et tiré au hasard, donc impossible à deviner (contrairement à un mot de passe).
 */
export const hacherJeton = (jeton: string) =>
  createHash('sha256').update(jeton).digest('hex');
