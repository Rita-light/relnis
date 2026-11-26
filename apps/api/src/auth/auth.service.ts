import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import {
  MotifFermeture,
  Prisma,
  Role,
  TypeJeton,
} from '../generated/prisma/client.js';
import { ErreurApi } from '../commun/erreur-api.js';
import { CourrielsService } from '../courriels/courriels.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { ConnexionDto } from './dto/connexion.dto.js';
import { InscriptionDto } from './dto/inscription.dto.js';
import {
  ChargeJetonAcces,
  DELAI_GRACE_RENOUVELLEMENT_MS,
  DUREE_ABSOLUE_MS,
  DUREE_INACTIVITE_MS,
} from './session.js';

// Une seule réponse pour tous les refus de renouvellement : on ne dit pas pourquoi.
const sessionInvalide = () =>
  new ErreurApi(
    HttpStatus.UNAUTHORIZED,
    'SESSION_INVALIDE',
    'Session expirée : reconnectez-vous',
  );

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

/** Blocage d'un compte après trop de mots de passe ratés (même depuis plusieurs adresses IP). */
export const MAX_ECHECS_CONNEXION = 5;
const DUREE_BLOCAGE_MS = 15 * 60_000; // 15 min

/** Délai minimum entre deux liens de vérification envoyés au même courriel. */
const DELAI_RENVOI_MS = 60_000; // 1 min

/**
 * Haché d'un jeton envoyé par courriel. SHA-256 suffit ici : le jeton est long
 * et tiré au hasard, donc impossible à deviner (contrairement à un mot de passe).
 */
export const hacherJeton = (jeton: string) =>
  createHash('sha256').update(jeton).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Haché d'un mot de passe au hasard, comparé quand le courriel n'existe pas (voir connecter()).
  private readonly hacheFactice = hash(
    randomBytes(16).toString('hex'),
    OPTIONS_ARGON2,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly courriels: CourrielsService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Vérifie les identifiants, ouvre une session et renvoie les deux jetons.
   * Une seule erreur pour « courriel inconnu » et « mauvais mot de passe » : on ne révèle pas qui est inscrit.
   */
  async connecter(
    dto: ConnexionDto,
    appareil: { navigateur?: string; adresseIp?: string },
  ) {
    // Compté par courriel, qu'il soit inscrit ou non : le blocage ne révèle pas qui utilise Relnis.
    const cleEchecs = `connexion:echecs:${dto.courriel}`;
    if (Number(await this.redis.get(cleEchecs)) >= MAX_ECHECS_CONNEXION) {
      throw new ErreurApi(
        HttpStatus.TOO_MANY_REQUESTS,
        'COMPTE_BLOQUE_TEMPORAIREMENT',
        "Trop d'essais : réessayez dans 15 minutes",
      );
    }

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { courriel: dto.courriel },
    });

    // Toujours un calcul Argon2, même sans compte : le temps de réponse ne trahit rien.
    const motDePasseValide = await verify(
      utilisateur?.motDePasseHache ?? (await this.hacheFactice),
      dto.motDePasse,
    );

    if (!utilisateur || !motDePasseValide || !utilisateur.actif) {
      // +1 échec ; le compteur s'efface tout seul 15 min après le premier échec.
      await this.redis
        .multi()
        .incr(cleEchecs)
        .pexpire(cleEchecs, DUREE_BLOCAGE_MS, 'NX')
        .exec();
      throw new ErreurApi(
        HttpStatus.UNAUTHORIZED,
        'IDENTIFIANTS_INVALIDES',
        'Courriel ou mot de passe incorrect',
      );
    }
    // Vérifié seulement avec le bon mot de passe : sinon, ce message révélerait que le compte existe.
    if (!utilisateur.courrielVerifie) {
      throw new ErreurApi(
        HttpStatus.FORBIDDEN,
        'COURRIEL_NON_VERIFIE',
        "Confirmez d'abord votre adresse courriel",
      );
    }

    // Connexion réussie : les échecs précédents sont oubliés.
    await this.redis.del(cleEchecs);

    const jetonRenouvellement = randomBytes(32).toString('base64url');
    const maintenant = Date.now();

    const [session] = await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          utilisateurId: utilisateur.id,
          jetonRenouvellementHache: hacherJeton(jetonRenouvellement),
          appareil: appareil.navigateur?.slice(0, 255),
          adresseIp: appareil.adresseIp,
          expireLe: new Date(maintenant + DUREE_INACTIVITE_MS),
          expireAbsoluLe: new Date(maintenant + DUREE_ABSOLUE_MS),
        },
      }),
      this.prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { derniereConnexion: new Date(maintenant) },
      }),
    ]);

    return {
      jetonAcces: await this.signerAcces(utilisateur, session.id),
      jetonRenouvellement,
      utilisateur: {
        id: utilisateur.id,
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        role: utilisateur.role,
        entrepriseId: utilisateur.entrepriseId,
      },
    };
  }

  /**
   * Échange le jeton de renouvellement contre un nouveau jeton d'accès, et remplace
   * le jeton de renouvellement (rotation). C'est ici que tout est revérifié en base :
   * session fermée ou expirée, compte désactivé.
   */
  async renouveler(jeton: string | undefined) {
    if (!jeton) throw sessionInvalide();
    const hache = hacherJeton(jeton);
    const maintenant = Date.now();

    const session = await this.prisma.session.findFirst({
      where: {
        OR: [{ jetonRenouvellementHache: hache }, { jetonPrecedentHache: hache }],
      },
      include: { utilisateur: true },
    });
    if (!session || session.fermeeLe) throw sessionInvalide();

    // Un ancien jeton présenté : deux onglets en même temps (délai de grâce), ou un vol.
    const ancienJeton = session.jetonRenouvellementHache !== hache;
    if (ancienJeton) {
      const depuisRotation = maintenant - (session.renouveleeLe?.getTime() ?? 0);
      if (depuisRotation > DELAI_GRACE_RENOUVELLEMENT_MS) {
        // Le voleur et la vraie personne sont coupés tous les deux : la personne se reconnecte.
        await this.prisma.session.update({
          where: { id: session.id },
          data: {
            fermeeLe: new Date(maintenant),
            motifFermeture: MotifFermeture.REUTILISATION_DETECTEE,
          },
        });
        this.logger.warn(`Réutilisation d'un jeton de renouvellement (session ${session.id})`);
        throw sessionInvalide();
      }
    }

    if (
      session.expireLe.getTime() <= maintenant ||
      session.expireAbsoluLe.getTime() <= maintenant ||
      !session.utilisateur.actif
    ) {
      throw sessionInvalide();
    }

    // Délai de grâce : nouvel accès, mais pas de nouvelle rotation (l'autre onglet l'a déjà faite).
    if (ancienJeton) {
      return { jetonAcces: await this.signerAcces(session.utilisateur, session.id) };
    }

    const nouveauJeton = randomBytes(32).toString('base64url');
    // La condition sur le jeton actuel évite deux rotations simultanées de la même session.
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, jetonRenouvellementHache: hache },
      data: {
        jetonRenouvellementHache: hacherJeton(nouveauJeton),
        jetonPrecedentHache: hache,
        renouveleeLe: new Date(maintenant),
        derniereActiviteLe: new Date(maintenant),
        // 7 jours de plus, sans jamais dépasser la limite absolue de 30 jours.
        expireLe: new Date(
          Math.min(maintenant + DUREE_INACTIVITE_MS, session.expireAbsoluLe.getTime()),
        ),
      },
    });
    if (count === 0) {
      return { jetonAcces: await this.signerAcces(session.utilisateur, session.id) };
    }

    return {
      // Rôle relu en base : un changement de rôle s'applique au plus tard au prochain renouvellement.
      jetonAcces: await this.signerAcces(session.utilisateur, session.id),
      jetonRenouvellement: nouveauJeton,
    };
  }

  /** Ferme la session liée au jeton de renouvellement, s'il y en a une. */
  async deconnecter(jeton: string | undefined) {
    if (!jeton) return;
    await this.prisma.session.updateMany({
      where: { jetonRenouvellementHache: hacherJeton(jeton), fermeeLe: null },
      data: {
        fermeeLe: new Date(),
        motifFermeture: MotifFermeture.DECONNEXION,
      },
    });
  }

  /** Signe un jeton d'accès de 15 min avec l'identité, l'entreprise et le rôle. */
  private signerAcces(
    utilisateur: { id: string; entrepriseId: string; role: Role },
    sessionId: string,
  ) {
    const charge: ChargeJetonAcces = {
      sub: utilisateur.id,
      ent: utilisateur.entrepriseId,
      role: utilisateur.role,
      sid: sessionId,
    };
    return this.jwt.signAsync(charge);
  }

  /** Le profil de la personne connectée, relu en base (toujours à jour). */
  async moi(utilisateurId: string) {
    return this.prisma.utilisateur.findUniqueOrThrow({
      where: { id: utilisateurId },
      select: {
        id: true,
        prenom: true,
        nom: true,
        courriel: true,
        role: true,
        langue: true,
        theme: true,
        entreprise: { select: { id: true, nom: true } },
      },
    });
  }

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
    // Au plus un lien par minute pour un même courriel, même depuis plusieurs adresses IP.
    // SET … NX : ne pose la clé que si elle n'existe pas déjà, en une seule opération.
    const premier = await this.redis.set(
      `verification:renvoi:${courriel}`,
      '1',
      'PX',
      DELAI_RENVOI_MS,
      'NX',
    );
    if (!premier) return;

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
