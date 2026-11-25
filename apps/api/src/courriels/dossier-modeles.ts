import { join } from 'node:path';

/** Dossier des modèles de courriels (copié dans dist/ au build : voir « assets » dans nest-cli.json). */
export const DOSSIER_MODELES = join(import.meta.dirname, 'modeles');
