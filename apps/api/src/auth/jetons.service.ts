import { randomBytes } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, TypeJeton } from '../generated/prisma/client.js';
import { ErreurApi } from '../commun/erreur-api.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hacherJeton } from './hacher-jeton.js';

const jetonInvalide = () =>
  new ErreurApi(
    HttpStatus.BAD_REQUEST,
    'JETON_INVALIDE',
    'Lien invalide ou déjà utilisé',
  );

/** Jetons à usage unique envoyés par courriel (vérification du courriel, mot de passe oublié). */
@Injectable()
export class JetonsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crée un jeton (valeur en clair pour le lien) ; les précédents du même type ne marchent plus. */
  async creer(utilisateurId: string, type: TypeJeton, dureeMs: number) {
    const jeton = randomBytes(32).toString('base64url');
    const maintenant = Date.now();
    await this.prisma.$transaction([
      this.prisma.jeton.updateMany({
        where: { utilisateurId, type, utiliseLe: null },
        data: { expireLe: new Date(maintenant) },
      }),
      this.prisma.jeton.create({
        data: {
          utilisateurId,
          type,
          jetonHache: hacherJeton(jeton), // seul le haché est enregistré
          expireLe: new Date(maintenant + dureeMs),
        },
      }),
    ]);
    return jeton;
  }

  /** Vérifie un jeton sans le consommer : type, pas encore utilisé, pas expiré. */
  async verifier(jeton: string, type: TypeJeton) {
    const trouve = await this.prisma.jeton.findUnique({
      where: { jetonHache: hacherJeton(jeton) },
    });

    // Un jeton d'un autre type est refusé.
    if (!trouve || trouve.type !== type || trouve.utiliseLe) {
      throw jetonInvalide();
    }
    if (trouve.expireLe < new Date()) {
      throw new ErreurApi(
        HttpStatus.BAD_REQUEST,
        'JETON_EXPIRE',
        'Lien expiré',
      );
    }
    return trouve;
  }

  /** Utilise un jeton et exécute « action » dans la même transaction (tout ou rien). */
  async utiliser<T>(
    jeton: string,
    type: TypeJeton,
    action: (tx: Prisma.TransactionClient, utilisateurId: string) => Promise<T>,
  ): Promise<T> {
    const trouve = await this.verifier(jeton, type);

    return this.prisma.$transaction(async (tx) => {
      // Condition « pas encore utilisé » : deux clics simultanés ne servent qu'une fois.
      const { count } = await tx.jeton.updateMany({
        where: { id: trouve.id, utiliseLe: null },
        data: { utiliseLe: new Date() },
      });
      if (count === 0) throw jetonInvalide();
      return action(tx, trouve.utilisateurId);
    });
  }
}
