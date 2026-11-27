import { randomBytes } from 'node:crypto';
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
import {
  PrismaService,
  PrismaSystemeService,
} from '../prisma/prisma.service.js';
import { executerLot } from '../redis/executer-lot.js';
import { RedisService } from '../redis/redis.service.js';
import { ConnexionDto } from './dto/connexion.dto.js';
import { InscriptionDto } from './dto/inscription.dto.js';
import { hacherJeton } from './hacher-jeton.js';
import { JetonsService } from './jetons.service.js';
import {
  exigerMotDePasseSolide,
  indicesPersonnels,
} from './solidite-mot-de-passe.js';
import {
  ChargeJetonAcces,
  cleSessionRevoquee,
  DELAI_GRACE_RENOUVELLEMENT_MS,
  DUREE_ABSOLUE_MS,
  DUREE_ACCES_SECONDES,
  DUREE_INACTIVITE_MS,
  type UtilisateurConnecte,
} from './session.js';

const identifiantsInvalides = () =>
  new ErreurApi(
    HttpStatus.UNAUTHORIZED,
    'IDENTIFIANTS_INVALIDES',
    'Courriel ou mot de passe incorrect',
  );

// Même réponse pour tous les refus : on ne dit pas pourquoi.
const sessionInvalide = () =>
  new ErreurApi(
    HttpStatus.UNAUTHORIZED,
    'SESSION_INVALIDE',
    'Session expirée : reconnectez-vous',
  );

/** Réglages Argon2id de l'OWASP, écrits ici pour ne jamais changer en silence. */
export const OPTIONS_ARGON2 = {
  memoryCost: 19456, // Kio (19 Mio)
  timeCost: 2, // passes
  parallelism: 1,
};

const DUREE_VERIFICATION_HEURES = 24;
const DUREE_REINITIALISATION_MINUTES = 60; // court : ce lien ouvre le compte

// Blocage : 5 échecs depuis une IP bloquent cette IP ; 20 au total bloquent le compte.
export const MAX_ECHECS_PAR_IP = 5;
export const MAX_ECHECS_TOTAL = 20;
const FENETRE_ECHECS_MS = 15 * 60_000;
const DUREE_BLOCAGE_MS = 15 * 60_000; // à partir du seuil atteint

const DELAI_RENVOI_MS = 60_000; // un lien par minute et par courriel

// Échecs d'un courriel : un hash Redis (compteurs par IP, total, blocages), chaque champ avec sa durée.
export const cleEchecs = (courriel: string) => `connexion:echecs:${courriel}`;
export const CHAMP_TOTAL = 'total';
export const champBlocage = (qui: string) => `bloque:${qui}`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Comparé quand le courriel n'existe pas : même durée de réponse.
  private readonly hacheFactice = hash(
    randomBytes(16).toString('hex'),
    OPTIONS_ARGON2,
  );

  constructor(
    // Système : la connexion, l'inscription et les liens agissent avant de connaître l'entreprise.
    private readonly systeme: PrismaSystemeService,
    private readonly prisma: PrismaService,
    private readonly courriels: CourrielsService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly jetons: JetonsService,
  ) {}

  /** Vérifie les identifiants et ouvre une session. Même erreur si le courriel est inconnu. */
  async connecter(
    dto: ConnexionDto,
    appareil: { navigateur?: string; adresseIp?: string },
  ) {
    const echecs = cleEchecs(dto.courriel);
    const ip = appareil.adresseIp ?? 'inconnue';
    const [blocageIp, blocageTotal] = await this.redis.hmget(
      echecs,
      champBlocage(ip),
      champBlocage(CHAMP_TOTAL),
    );
    if (blocageIp || blocageTotal) {
      throw new ErreurApi(
        HttpStatus.TOO_MANY_REQUESTS,
        'COMPTE_BLOQUE_TEMPORAIREMENT',
        "Trop d'essais : réessayez dans 15 minutes",
      );
    }

    const utilisateur = await this.systeme.utilisateur.findUnique({
      where: { courriel: dto.courriel },
    });

    // Argon2 même sans compte : le temps de réponse ne trahit rien.
    const motDePasseValide = await verify(
      utilisateur?.motDePasseHache ?? (await this.hacheFactice),
      dto.motDePasse,
    );

    if (!utilisateur || !motDePasseValide || !utilisateur.actif) {
      await this.compterEchec(echecs, ip);
      throw identifiantsInvalides();
    }
    // Seulement avec le bon mot de passe, sinon ce message révélerait le compte.
    if (!utilisateur.courrielVerifie) {
      throw new ErreurApi(
        HttpStatus.FORBIDDEN,
        'COURRIEL_NON_VERIFIE',
        "Confirmez d'abord votre adresse courriel",
      );
    }

    await this.redis.del(echecs); // réussite : échecs oubliés

    const jetonRenouvellement = randomBytes(32).toString('base64url');
    const maintenant = Date.now();
    const session = await this.systeme.$transaction(async (tx) => {
      // Verrouille l'utilisateur ; échoue si le mot de passe a changé (ou le compte désactivé) entre-temps.
      const { count } = await tx.utilisateur.updateMany({
        where: {
          id: utilisateur.id,
          motDePasseHache: utilisateur.motDePasseHache,
          actif: true,
        },
        data: { derniereConnexion: new Date(maintenant) },
      });
      if (count === 0) throw identifiantsInvalides();

      return tx.session.create({
        data: {
          utilisateurId: utilisateur.id,
          jetonRenouvellementHache: hacherJeton(jetonRenouvellement),
          appareil: appareil.navigateur?.slice(0, 255),
          adresseIp: appareil.adresseIp,
          expireLe: new Date(maintenant + DUREE_INACTIVITE_MS),
          expireAbsoluLe: new Date(maintenant + DUREE_ABSOLUE_MS),
        },
      });
    });

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

  /** Nouveau jeton d'accès + rotation du jeton de renouvellement, après vérification en base. */
  async renouveler(jeton: string | undefined) {
    if (!jeton) throw sessionInvalide();
    const hache = hacherJeton(jeton);
    const maintenant = Date.now();

    const session = await this.systeme.session.findFirst({
      where: {
        OR: [
          { jetonRenouvellementHache: hache },
          { jetonPrecedentHache: hache },
        ],
      },
      include: { utilisateur: true },
    });
    if (!session || session.fermeeLe) throw sessionInvalide();

    // Ancien jeton : deux onglets (délai de grâce) ou un vol.
    const ancienJeton = session.jetonRenouvellementHache !== hache;
    if (ancienJeton) {
      const depuisRotation =
        maintenant - (session.renouveleeLe?.getTime() ?? 0);
      if (depuisRotation > DELAI_GRACE_RENOUVELLEMENT_MS) {
        // Vol probable : on coupe tout le monde, la vraie personne se reconnectera.
        await this.revoquerSessions([session.id]);
        await this.systeme.session.update({
          where: { id: session.id },
          data: {
            fermeeLe: new Date(maintenant),
            motifFermeture: MotifFermeture.REUTILISATION_DETECTEE,
          },
        });
        this.logger.warn(
          `Réutilisation d'un jeton de renouvellement (session ${session.id})`,
        );
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

    // Délai de grâce : l'autre onglet a déjà fait la rotation.
    if (ancienJeton) {
      return {
        jetonAcces: await this.signerAcces(session.utilisateur, session.id),
      };
    }

    const nouveauJeton = randomBytes(32).toString('base64url');
    // Condition sur le jeton actuel : une seule rotation si deux requêtes arrivent ensemble.
    const { count } = await this.systeme.session.updateMany({
      where: { id: session.id, jetonRenouvellementHache: hache },
      data: {
        jetonRenouvellementHache: hacherJeton(nouveauJeton),
        jetonPrecedentHache: hache,
        renouveleeLe: new Date(maintenant),
        derniereActiviteLe: new Date(maintenant),
        // +7 jours, jamais au-delà de la limite de 30 jours.
        expireLe: new Date(
          Math.min(
            maintenant + DUREE_INACTIVITE_MS,
            session.expireAbsoluLe.getTime(),
          ),
        ),
      },
    });
    if (count === 0) {
      return {
        jetonAcces: await this.signerAcces(session.utilisateur, session.id),
      };
    }

    // Rôle relu en base : un changement de rôle s'applique au prochain renouvellement.
    return {
      jetonAcces: await this.signerAcces(session.utilisateur, session.id),
      jetonRenouvellement: nouveauJeton,
    };
  }

  /** Ferme la session du jeton actuel ou précédent (cas des deux onglets). */
  async deconnecter(jeton: string | undefined) {
    if (!jeton) return;
    const hache = hacherJeton(jeton);
    const session = await this.systeme.session.findFirst({
      where: {
        OR: [
          { jetonRenouvellementHache: hache },
          { jetonPrecedentHache: hache },
        ],
        fermeeLe: null,
      },
    });
    if (!session) return;

    await this.revoquerSessions([session.id]);
    await this.systeme.session.update({
      where: { id: session.id },
      data: {
        fermeeLe: new Date(),
        motifFermeture: MotifFermeture.DECONNEXION,
      },
    });
  }

  /** Révoque dans Redis (refus immédiat par le garde). Toujours AVANT de fermer en base. */
  private async revoquerSessions(sessionIds: string[]) {
    if (sessionIds.length === 0) return;
    const lot = this.redis.multi();
    for (const id of sessionIds) {
      lot.set(cleSessionRevoquee(id), '1', 'PX', DUREE_ACCES_SECONDES * 1000);
    }
    await executerLot(lot);
  }

  /**
   * +1 échec (IP et total), compté 15 min. Au seuil, un blocage de 15 min à partir de maintenant.
   * Chaque champ a sa propre durée (HPEXPIRE) : un blocage ne prolonge pas les autres compteurs.
   */
  private async compterEchec(echecs: string, ip: string) {
    const [parIp, , total] = await executerLot(
      this.redis
        .multi()
        .hincrby(echecs, ip, 1)
        .hpexpire(echecs, FENETRE_ECHECS_MS, 'NX', 'FIELDS', 1, ip)
        .hincrby(echecs, CHAMP_TOTAL, 1)
        .hpexpire(echecs, FENETRE_ECHECS_MS, 'NX', 'FIELDS', 1, CHAMP_TOTAL),
    );

    const blocages: string[] = [];
    if (Number(parIp) >= MAX_ECHECS_PAR_IP) blocages.push(champBlocage(ip));
    if (Number(total) >= MAX_ECHECS_TOTAL)
      blocages.push(champBlocage(CHAMP_TOTAL));
    if (blocages.length === 0) return;

    const lot = this.redis.multi();
    for (const champ of blocages) {
      lot
        .hset(echecs, champ, '1')
        .hpexpire(echecs, DUREE_BLOCAGE_MS, 'FIELDS', 1, champ);
    }
    await executerLot(lot);
  }

  /** Jeton d'accès de 15 min : identité, entreprise, rôle, session. */
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

  /** Profil de la personne connectée, relu en base. */
  // Lu avec relnis_app, dans l'entreprise du jeton : le RLS s'applique comme pour toute donnée d'entreprise.
  async moi({ id, entrepriseId }: UtilisateurConnecte) {
    return this.prisma.avecEntreprise(entrepriseId, (tx) =>
      tx.utilisateur.findUniqueOrThrow({
        where: { id },
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
      }),
    );
  }

  /** Crée l'entreprise et son administrateur, ensemble ou pas du tout. */
  async inscrire(dto: InscriptionDto) {
    exigerMotDePasseSolide(
      dto.motDePasse,
      indicesPersonnels(dto.courriel, dto.prenom, dto.nom, dto.nomEntreprise),
    );
    const motDePasseHache = await hash(dto.motDePasse, OPTIONS_ARGON2);

    let utilisateur;
    try {
      utilisateur = await this.systeme.$transaction(async (tx) => {
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
      // P2002 : courriel déjà pris (colonne unique).
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

    // Après la transaction : un courriel ne s'annule pas.
    await this.envoyerLienVerification(utilisateur);

    return {
      utilisateurId: utilisateur.id,
      entrepriseId: utilisateur.entrepriseId,
    };
  }

  /** Confirme le courriel avec le jeton du lien. */
  async verifierCourriel(jeton: string) {
    await this.jetons.utiliser(
      jeton,
      TypeJeton.VERIFICATION_COURRIEL,
      (tx, utilisateurId) =>
        tx.utilisateur.update({
          where: { id: utilisateurId },
          data: { courrielVerifie: true },
        }),
    );
    return { courrielVerifie: true };
  }

  /** Nouveau lien de vérification, si le compte existe et n'est pas vérifié. */
  async renvoyerVerification(courriel: string) {
    if (!(await this.premierEnvoiDeLaMinute('verification', courriel))) return;

    this.enArrierePlan('renvoi du lien de vérification', async () => {
      const utilisateur = await this.systeme.utilisateur.findUnique({
        where: { courriel },
      });
      if (utilisateur?.actif && !utilisateur.courrielVerifie) {
        await this.envoyerLienVerification(utilisateur);
      }
    });
  }

  /** « Mot de passe oublié » : lien si le compte existe et est actif. */
  async demanderReinitialisation(courriel: string) {
    if (!(await this.premierEnvoiDeLaMinute('mot-de-passe', courriel))) return;

    this.enArrierePlan('lien de réinitialisation', async () => {
      const utilisateur = await this.systeme.utilisateur.findUnique({
        where: { courriel },
      });
      if (utilisateur?.actif) {
        await this.envoyerLienReinitialisation(utilisateur);
      }
    });
  }

  /**
   * Travail lancé sans l'attendre : la durée de réponse ne trahit pas les comptes.
   * Perdu si l'API redémarre entre-temps ; BullMQ (phase 3) le rendra durable.
   */
  private enArrierePlan(description: string, travail: () => Promise<void>) {
    travail().catch((erreur: unknown) => {
      this.logger.error(`Échec en arrière-plan : ${description}`, erreur);
    });
  }

  /** Change le mot de passe avec le jeton du lien, puis ferme toutes les sessions. */
  async reinitialiserMotDePasse(jeton: string, motDePasse: string) {
    // Jeton vérifié avant Argon2 : un jeton inventé ne coûte rien au serveur.
    const { utilisateurId } = await this.jetons.verifier(
      jeton,
      TypeJeton.MOT_DE_PASSE,
    );

    // Solidité jugée avec les infos de la personne ; un refus laisse le lien utilisable.
    const personne = await this.systeme.utilisateur.findUniqueOrThrow({
      where: { id: utilisateurId },
      select: {
        courriel: true,
        prenom: true,
        nom: true,
        entreprise: { select: { nom: true } },
      },
    });
    exigerMotDePasseSolide(
      motDePasse,
      indicesPersonnels(
        personne.courriel,
        personne.prenom,
        personne.nom,
        personne.entreprise.nom,
      ),
    );

    const motDePasseHache = await hash(motDePasse, OPTIONS_ARGON2);
    const maintenant = new Date();

    const utilisateur = await this.jetons.utiliser(
      jeton,
      TypeJeton.MOT_DE_PASSE,
      async (tx, utilisateurId) => {
        const modifie = await tx.utilisateur.update({
          where: { id: utilisateurId },
          data: { motDePasseHache, courrielVerifie: true }, // le lien prouve l'adresse
        });
        if (!modifie.actif) {
          // Annule la transaction : un compte désactivé ne se réactive pas ainsi.
          throw new ErreurApi(
            HttpStatus.BAD_REQUEST,
            'JETON_INVALIDE',
            'Lien invalide ou déjà utilisé',
          );
        }
        const ouvertes = await tx.session.findMany({
          where: { utilisateurId, fermeeLe: null },
          select: { id: true },
        });
        const ids = ouvertes.map((s) => s.id);
        // Redis d'abord : s'il échoue, la transaction est annulée.
        await this.revoquerSessions(ids);
        await tx.session.updateMany({
          where: { id: { in: ids } },
          data: {
            fermeeLe: maintenant,
            motifFermeture: MotifFermeture.MOT_DE_PASSE_CHANGE,
          },
        });
        return modifie;
      },
    );

    await this.redis.del(cleEchecs(utilisateur.courriel)); // échecs d'avant oubliés
    return { motDePasseModifie: true };
  }

  /** Un courriel par minute et par usage pour une adresse (SET NX, en une opération). */
  private async premierEnvoiDeLaMinute(usage: string, courriel: string) {
    const pose = await this.redis.set(
      `courriel:${usage}:${courriel}`,
      '1',
      'PX',
      DELAI_RENVOI_MS,
      'NX',
    );
    return pose === 'OK';
  }

  /** Crée un jeton « mot de passe » et l'envoie. Ne lance jamais d'erreur (journalisée). */
  private async envoyerLienReinitialisation(utilisateur: {
    id: string;
    courriel: string;
    prenom: string;
  }) {
    try {
      const jeton = await this.jetons.creer(
        utilisateur.id,
        TypeJeton.MOT_DE_PASSE,
        DUREE_REINITIALISATION_MINUTES * 60_000,
      );
      await this.courriels.envoyerReinitialisation(
        utilisateur,
        jeton,
        DUREE_REINITIALISATION_MINUTES,
      );
    } catch (erreur) {
      this.logger.error(
        `Lien de réinitialisation non envoyé (utilisateur ${utilisateur.id})`,
        erreur,
      );
    }
  }

  /** Crée un jeton de vérification et l'envoie. Ne lance jamais d'erreur (journalisée). */
  private async envoyerLienVerification(utilisateur: {
    id: string;
    courriel: string;
    prenom: string;
  }) {
    try {
      const jeton = await this.jetons.creer(
        utilisateur.id,
        TypeJeton.VERIFICATION_COURRIEL,
        DUREE_VERIFICATION_HEURES * 3_600_000,
      );
      await this.courriels.envoyerVerification(
        utilisateur,
        jeton,
        DUREE_VERIFICATION_HEURES,
      );
    } catch (erreur) {
      this.logger.error(
        `Lien de vérification non envoyé (utilisateur ${utilisateur.id})`,
        erreur,
      );
    }
  }
}
