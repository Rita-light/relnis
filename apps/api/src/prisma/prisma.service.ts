import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

/** Connexion à la base avec un rôle précis, vérifié au démarrage (rôles : migration 20261126200000_roles). */
abstract class ConnexionBase
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    config: ConfigService,
    private readonly variable: string,
    private readonly roleAttendu: 'relnis_app' | 'relnis_systeme',
  ) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>(variable),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.verifierRole();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Refuse de démarrer avec un rôle mal réglé : un superutilisateur, le propriétaire des tables
  // ou l'un de ses membres pourrait ignorer le RLS (ou le désactiver) sans rien dire.
  private async verifierRole() {
    const [role] = await this.$queryRaw<
      {
        nom: string;
        superutilisateur: boolean;
        contourneRls: boolean;
        proprietaire: boolean;
      }[]
    >`SELECT rolname AS nom, rolsuper AS superutilisateur, rolbypassrls AS "contourneRls",
        EXISTS (SELECT FROM pg_tables WHERE pg_has_role(current_user, tableowner, 'MEMBER')) AS proprietaire
      FROM pg_roles WHERE rolname = current_user`;
    const contourneRlsAttendu = this.roleAttendu === 'relnis_systeme';
    const problemes = [
      role.nom !== this.roleAttendu && 'autre rôle',
      role.superutilisateur && 'superutilisateur',
      role.proprietaire && 'propriétaire des tables ou membre de ce rôle',
      role.contourneRls !== contourneRlsAttendu &&
        (role.contourneRls ? 'contourne le RLS' : 'ne contourne pas le RLS'),
    ].filter(Boolean);
    if (problemes.length > 0) {
      throw new Error(
        `${this.variable} : le rôle « ${role.nom} » ne convient pas (${problemes.join(', ')}) ; ` +
          `${this.roleAttendu} attendu, voir le README de l'API.`,
      );
    }
  }
}

/** Accès à la base pour toute l'API : rôle relnis_app, soumis à l'isolation entre entreprises (RLS). */
@Injectable()
export class PrismaService extends ConnexionBase {
  constructor(config: ConfigService) {
    super(config, 'DATABASE_URL', 'relnis_app');
  }

  /**
   * Seule porte vers les données d'une entreprise : une transaction où le RLS ne laisse voir que `entrepriseId`
   * (toujours celui du jeton). Hors de cette méthode, les tables protégées ne renvoient aucune ligne.
   */
  avecEntreprise<T>(
    entrepriseId: string,
    travail: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // true : le réglage s'efface à la fin de la transaction (rien ne reste sur la connexion du pool).
      await tx.$executeRaw`SELECT set_config('app.entreprise_id', ${entrepriseId}, true)`;
      return travail(tx);
    });
  }
}

/**
 * Accès « système », réservé au module d'authentification (fourni par AuthModule seulement) :
 * rôle relnis_systeme, qui contourne le RLS pour agir avant de connaître l'entreprise.
 */
@Injectable()
export class PrismaSystemeService extends ConnexionBase {
  constructor(config: ConfigService) {
    super(config, 'DATABASE_URL_SYSTEME', 'relnis_systeme');
  }
}
