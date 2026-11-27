import type { DocumentLegal, NomDocument } from './documents'

// Version française des documents légaux (elle prévaut en cas de différence avec l'anglais).
export const documentsFr: Record<NomDocument, DocumentLegal> = {
  conditions: {
    titre: "Conditions d'utilisation",
    intro:
      "Ces conditions encadrent l'utilisation de Relnis. En créant un compte, vous les acceptez au nom de votre entreprise.",
    sections: [
      {
        titre: 'Le service',
        avant: [
          "Relnis est un logiciel en ligne de gestion d'inventaire destiné aux entreprises. Il est en cours de développement : des fonctions peuvent être ajoutées, modifiées ou retirées.",
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Votre compte',
        avant: [],
        liste: [
          "La personne qui crée l'entreprise en devient l'administrateur.",
          'Vous fournissez des renseignements exacts et les tenez à jour.',
          'Vous gardez votre mot de passe confidentiel et nous avisez sans tarder de toute utilisation non autorisée.',
          'Vous êtes responsable des actions faites avec les comptes de votre entreprise.',
        ],
        apres: [],
      },
      {
        titre: 'Utilisation acceptable',
        avant: ['Vous vous engagez à ne pas :'],
        liste: [
          "tenter d'accéder aux données d'une autre entreprise ou de contourner les mesures de sécurité ;",
          'perturber le fonctionnement du service (envois massifs, attaques, robots) ;',
          'utiliser Relnis à des fins illégales.',
        ],
        apres: [],
      },
      {
        titre: 'Vos données',
        avant: [],
        liste: [
          'Les données que votre entreprise saisit dans Relnis lui appartiennent.',
          'Nous les traitons uniquement pour fournir le service, comme le décrit la politique de confidentialité.',
        ],
        apres: [],
      },
      {
        titre: 'Disponibilité',
        avant: [
          'Nous faisons de notre mieux pour que Relnis soit disponible et fiable. Pendant la phase de développement, le service est fourni tel quel, sans garantie de disponibilité continue : des interruptions peuvent survenir.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Prix',
        avant: [
          'Les conditions commerciales (prix, facturation) seront précisées avant toute facturation. Aucuns frais ne peuvent vous être demandés sans votre accord préalable.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: "Suspension et fin d'utilisation",
        avant: [],
        liste: [
          "Vous pouvez cesser d'utiliser Relnis en tout temps.",
          "Nous pouvons suspendre un compte qui ne respecte pas ces conditions, après un avis lorsque c'est possible.",
        ],
        apres: [],
      },
      {
        titre: 'Responsabilité',
        avant: [
          "Dans la mesure permise par la loi, Relnis n'est pas responsable des dommages indirects découlant de l'utilisation du service, comme une perte de profits.",
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Modifications des conditions',
        avant: [
          'Nous pouvons modifier ces conditions. La date de mise à jour est indiquée en haut de la page ; en cas de changement important, nous vous en informons par courriel avant son entrée en vigueur.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Droit applicable et langue',
        avant: [],
        liste: [
          "Ces conditions sont régies par les lois du Québec et les lois du Canada qui s'y appliquent.",
          'Elles sont rédigées en français. La version anglaise est fournie pour faciliter la lecture ; en cas de différence, la version française prévaut.',
        ],
        apres: [],
      },
      {
        titre: 'Nous joindre',
        avant: ['Coordonnées : à préciser avant la mise en production.'],
        liste: [],
        apres: [],
      },
    ],
  },
  confidentialite: {
    titre: 'Politique de confidentialité',
    intro:
      'Cette politique explique quels renseignements personnels Relnis recueille, pourquoi, et quels sont vos droits. Elle est rédigée en termes simples, comme le demande la Loi 25 du Québec.',
    sections: [
      {
        titre: 'Responsable de la protection des renseignements personnels',
        avant: [
          'Cette personne veille au respect de la présente politique et répond à vos demandes.',
          'Responsable et coordonnées : à désigner avant la mise en production.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Renseignements que nous recueillons',
        avant: [],
        liste: [
          "À l'inscription : le nom de l'entreprise, votre prénom, votre nom et votre adresse courriel.",
          "Votre mot de passe n'est jamais conservé tel quel : seule une empreinte chiffrée (Argon2id) est enregistrée.",
          "À chaque connexion : l'adresse IP, le type de navigateur, ainsi que les dates de connexion et de dernière activité de la session.",
          'Les données que votre entreprise saisit dans Relnis, par exemple ses articles et ses stocks.',
        ],
        apres: ["Nous n'utilisons ni publicité ni outil de mesure d'audience, et nous ne vendons aucune donnée."],
      },
      {
        titre: 'Pourquoi nous les utilisons',
        avant: [],
        liste: [
          'Créer votre compte et celui de votre entreprise.',
          'Confirmer votre adresse courriel et vous envoyer les courriels nécessaires (confirmation, nouveau mot de passe).',
          'Vous connecter et garder votre session ouverte de façon sécurisée.',
          "Protéger les comptes contre les accès frauduleux : nombre d'essais limité, blocage temporaire, refus des mots de passe trop faciles à deviner.",
        ],
        apres: ['Nous ne les utilisons à aucune autre fin sans votre consentement.'],
      },
      {
        titre: 'Témoins (cookies) et stockage dans le navigateur',
        avant: [
          'Relnis utilise seulement deux témoins, nécessaires à la connexion. Ils ne sont lisibles que par Relnis, et non par les scripts de la page.',
        ],
        liste: [
          'relnis_acces : prouve que vous êtes connecté ; valide 15 minutes.',
          'relnis_renouvellement : prolonge votre session ; expire après 7 jours sans activité, et au plus tard après 30 jours.',
        ],
        apres: [
          "Votre choix de langue est gardé dans le stockage local de votre navigateur. Aucun témoin publicitaire ou de suivi n'est utilisé.",
        ],
      },
      {
        titre: "Fournisseurs et lieu d'hébergement",
        avant: [
          "Nous faisons appel à des fournisseurs pour héberger l'application et envoyer les courriels. Ils n'ont accès qu'aux renseignements nécessaires à leur tâche.",
          "La liste de ces fournisseurs et les pays où les données sont hébergées seront précisés avant la mise en production. Si des renseignements devaient être hébergés hors du Québec, une évaluation des facteurs relatifs à la vie privée serait faite au préalable, comme l'exige la loi.",
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Durée de conservation',
        avant: [],
        liste: [
          'Les liens envoyés par courriel expirent : 24 heures pour confirmer le courriel, 60 minutes pour choisir un nouveau mot de passe.',
          'Une session se ferme à la déconnexion, après 7 jours sans activité, ou au plus tard après 30 jours.',
          "Les renseignements du compte sont conservés tant que le compte est actif. Les règles de suppression après la fermeture d'un compte seront précisées avant la mise en production.",
        ],
        apres: [],
      },
      {
        titre: 'Sécurité',
        avant: [],
        liste: [
          'Communications chiffrées (HTTPS).',
          "Mots de passe conservés seulement sous forme d'empreinte (Argon2id).",
          "Sessions fermées immédiatement à la déconnexion et lors d'un changement de mot de passe.",
          "Nombre d'essais de connexion limité, avec blocage temporaire.",
        ],
        apres: [],
      },
      {
        titre: 'Vos droits',
        avant: ['Vous pouvez en tout temps :'],
        liste: [
          'consulter les renseignements que nous détenons sur vous ;',
          "les faire corriger s'ils sont inexacts ou incomplets ;",
          'retirer votre consentement ou demander la suppression de vos renseignements ;',
          'recevoir vos renseignements dans un format technologique structuré et couramment utilisé (portabilité).',
        ],
        apres: [
          'Pour exercer ces droits, écrivez à la personne responsable (section 1). Nous répondons dans un délai de 30 jours.',
          "Si notre réponse ne vous satisfait pas, vous pouvez vous adresser à la Commission d'accès à l'information du Québec.",
        ],
      },
      {
        titre: 'Incident de confidentialité',
        avant: [
          "Si un incident présente un risque de préjudice sérieux, nous en avisons sans tarder la Commission d'accès à l'information et les personnes concernées.",
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Modifications',
        avant: [
          'La date de la dernière mise à jour est indiquée en haut de cette page. En cas de changement important, nous vous en informons par courriel.',
        ],
        liste: [],
        apres: [],
      },
    ],
  },
}
