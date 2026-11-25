import { HttpStatus, Injectable } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { Prisma, Role } from '../generated/prisma/client.js';
import { ErreurApi } from '../commun/erreur-api.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InscriptionDto } from './dto/inscription.dto.js';

/**
 * Réglages Argon2id recommandés par l'OWASP.
 * Écrits ici pour qu'ils ne changent jamais en silence.
 */
export const OPTIONS_ARGON2 = {
  memoryCost: 19456, // en Kio (19 Mio)
  timeCost: 2, // nombre de passes
  parallelism: 1,
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crée l'entreprise et son premier administrateur, ensemble ou pas du tout. */
  async inscrire(dto: InscriptionDto) {
    // Argon2id : le mot de passe n'est jamais enregistré en clair.
    const motDePasseHache = await hash(dto.motDePasse, OPTIONS_ARGON2);

    try {
      const utilisateur = await this.prisma.$transaction(async (tx) => {
        const entreprise = await tx.entreprise.create({
          data: { nom: dto.nomEntreprise },
        });
        return tx.utilisateur.create({
          data: {
            entrepriseId: entreprise.id,
            prenom: dto.prenom,
            nom: dto.nom,
            courriel: dto.courriel,
            motDePasseHache,
            role: Role.ADMINISTRATEUR,
          },
        });
      });

      return {
        utilisateurId: utilisateur.id,
        entrepriseId: utilisateur.entrepriseId,
      };
    } catch (erreur) {
      // P2002 : valeur déjà prise sur une colonne unique (ici, le courriel).
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new ErreurApi(
          HttpStatus.CONFLICT,
          'COURRIEL_DEJA_UTILISE',
          'Ce courriel est déjà utilisé',
        );
      }
      throw erreur;
    }
  }
}
