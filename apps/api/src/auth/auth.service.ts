import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { Prisma, Role, TypeJeton } from '../generated/prisma/client.js';
import { ErreurApi } from '../commun/erreur-api.js';
import { CourrielsService } from '../courriels/courriels.service.js';
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

/** Durée de validité d'un lien de vérification. */
const DUREE_VERIFICATION_HEURES = 24;

/**
 * Haché d'un jeton envoyé par courriel. SHA-256 suffit ici : le jeton est long
 * et tiré au hasard, donc impossible à deviner (contrairement à un mot de passe).
 */
export const hacherJeton = (jeton: string) =>
  createHash('sha256').update(jeton).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly courriels: CourrielsService,
  ) {}

  /** Crée l'entreprise et son premier administrateur, ensemble ou pas du tout. */
  async inscrire(dto: InscriptionDto) {
    // Argon2id : le mot de passe n'est jamais enregistré en clair.
    const motDePasseHache = await hash(dto.motDePasse, OPTIONS_ARGON2);

    let utilisateur;
    try {
      utilisateur = await this.prisma.$transaction(async (tx) => {
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

    // Après la transaction : un courriel ne s'annule pas, on l'envoie une fois le compte créé.
    await this.envoyerLienVerification(utilisateur);

    return {
      utilisateurId: utilisateur.id,
      entrepriseId: utilisateur.entrepriseId,
    };
  }

  /** Confirme le courriel si le jeton existe, n'a pas servi et n'a pas expiré. */
  async verifierCourriel(jeton: string) {
    const trouve = await this.prisma.jeton.findUnique({
      where: { jetonHache: hacherJeton(jeton) },
    });

    if (
      !trouve ||
      trouve.type !== TypeJeton.VERIFICATION_COURRIEL ||
      trouve.utiliseLe
    ) {
      throw new ErreurApi(
        HttpStatus.BAD_REQUEST,
        'JETON_INVALIDE',
        'Lien invalide ou déjà utilisé',
      );
    }
    if (trouve.expireLe < new Date()) {
      throw new ErreurApi(HttpStatus.BAD_REQUEST, 'JETON_EXPIRE', 'Lien expiré');
    }

    await this.prisma.$transaction(async (tx) => {
      // « Pas encore utilisé » dans la condition : deux clics simultanés ne valident qu'une fois.
      const { count } = await tx.jeton.updateMany({
        where: { id: trouve.id, utiliseLe: null },
        data: { utiliseLe: new Date() },
      });
      if (count === 0) {
        throw new ErreurApi(
          HttpStatus.BAD_REQUEST,
          'JETON_INVALIDE',
          'Lien invalide ou déjà utilisé',
        );
      }
      await tx.utilisateur.update({
        where: { id: trouve.utilisateurId },
        data: { courrielVerifie: true },
      });
    });

    return { courrielVerifie: true };
  }

  /**
   * Envoie un nouveau lien si le compte existe et n'est pas encore vérifié.
   * Ne dit jamais si le courriel est inscrit : on ne révèle pas qui utilise Relnis.
   */
  async renvoyerVerification(courriel: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { courriel },
    });
    if (!utilisateur || !utilisateur.actif || utilisateur.courrielVerifie) {
      return;
    }

    // Les anciens liens ne fonctionnent plus : seul le dernier envoyé compte.
    await this.prisma.jeton.updateMany({
      where: {
        utilisateurId: utilisateur.id,
        type: TypeJeton.VERIFICATION_COURRIEL,
        utiliseLe: null,
      },
      data: { expireLe: new Date() },
    });
    await this.envoyerLienVerification(utilisateur);
  }

  /** Crée un jeton (seul son haché est gardé) et l'envoie par courriel. */
  private async envoyerLienVerification(utilisateur: {
    id: string;
    courriel: string;
    prenom: string;
  }) {
    try {
      const jeton = randomBytes(32).toString('base64url');
      await this.prisma.jeton.create({
        data: {
          utilisateurId: utilisateur.id,
          type: TypeJeton.VERIFICATION_COURRIEL,
          jetonHache: hacherJeton(jeton),
          expireLe: new Date(Date.now() + DUREE_VERIFICATION_HEURES * 3_600_000),
        },
      });
      await this.courriels.envoyerVerification(
        utilisateur,
        jeton,
        DUREE_VERIFICATION_HEURES,
      );
    } catch (erreur) {
      // Le compte existe quand même : la personne pourra demander un nouveau lien.
      this.logger.error(
        `Lien de vérification non envoyé (utilisateur ${utilisateur.id})`,
        erreur,
      );
    }
  }
}
