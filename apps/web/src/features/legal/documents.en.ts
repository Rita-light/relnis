import type { DocumentLegal, NomDocument } from './documents'

// English version of the legal documents (the French version prevails).
export const documentsEn: Record<NomDocument, DocumentLegal> = {
  conditions: {
    titre: 'Terms of use',
    intro: 'These terms govern the use of Relnis. By creating an account, you accept them on behalf of your company.',
    sections: [
      {
        titre: 'The service',
        avant: [
          'Relnis is an online inventory management software for businesses. It is under development: features may be added, changed or removed.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Your account',
        avant: [],
        liste: [
          'The person who creates the company becomes its administrator.',
          'You provide accurate information and keep it up to date.',
          'You keep your password confidential and promptly notify us of any unauthorized use.',
          "You are responsible for the actions taken with your company's accounts.",
        ],
        apres: [],
      },
      {
        titre: 'Acceptable use',
        avant: ['You agree not to:'],
        liste: [
          "try to access another company's data or bypass security measures;",
          'disrupt the service (mass sending, attacks, bots);',
          'use Relnis for illegal purposes.',
        ],
        apres: [],
      },
      {
        titre: 'Your data',
        avant: [],
        liste: [
          'The data your company enters in Relnis belongs to it.',
          'We process it only to provide the service, as described in the privacy policy.',
        ],
        apres: [],
      },
      {
        titre: 'Availability',
        avant: [
          'We do our best to keep Relnis available and reliable. During the development phase, the service is provided as is, without any guarantee of continuous availability: interruptions may occur.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Pricing',
        avant: [
          'Commercial terms (pricing, billing) will be specified before any billing. No fees can be charged to you without your prior agreement.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Suspension and end of use',
        avant: [],
        liste: [
          'You can stop using Relnis at any time.',
          'We may suspend an account that does not respect these terms, after notice when possible.',
        ],
        apres: [],
      },
      {
        titre: 'Liability',
        avant: [
          'To the extent permitted by law, Relnis is not liable for indirect damages resulting from the use of the service, such as loss of profits.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Changes to the terms',
        avant: [
          'We may change these terms. The update date is shown at the top of the page; if there is an important change, we will inform you by email before it takes effect.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Governing law and language',
        avant: [],
        liste: [
          'These terms are governed by the laws of Québec and the applicable laws of Canada.',
          'They are written in French. The English version is provided for convenience; in case of any difference, the French version prevails.',
        ],
        apres: [],
      },
      {
        titre: 'Contact us',
        avant: ['Contact details: to be specified before going live.'],
        liste: [],
        apres: [],
      },
    ],
  },
  confidentialite: {
    titre: 'Privacy policy',
    intro:
      "This policy explains what personal information Relnis collects, why, and what your rights are. It is written in plain language, as required by Québec's Law 25.",
    sections: [
      {
        titre: 'Person in charge of the protection of personal information',
        avant: [
          'This person ensures that this policy is respected and answers your requests.',
          'Person in charge and contact details: to be designated before going live.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Information we collect',
        avant: [],
        liste: [
          'When you sign up: the company name, your first name, your last name and your email address.',
          'Your password is never stored as is: only an encrypted fingerprint (Argon2id) is kept.',
          "Each time you sign in: the IP address, the type of browser, and the session's sign-in and last activity dates.",
          'The data your company enters in Relnis, such as its items and stock.',
        ],
        apres: ['We use no advertising and no audience measurement tool, and we do not sell any data.'],
      },
      {
        titre: 'Why we use it',
        avant: [],
        liste: [
          "To create your account and your company's account.",
          'To confirm your email address and send you the necessary emails (confirmation, new password).',
          'To sign you in and keep your session open securely.',
          'To protect accounts against fraudulent access: limited attempts, temporary lockout, rejection of passwords that are too easy to guess.',
        ],
        apres: ['We do not use it for any other purpose without your consent.'],
      },
      {
        titre: 'Cookies and browser storage',
        avant: [
          "Relnis uses only two cookies, required to sign in. They can only be read by Relnis, not by the page's scripts.",
        ],
        liste: [
          'relnis_acces: proves that you are signed in; valid for 15 minutes.',
          'relnis_renouvellement: extends your session; expires after 7 days without activity, and after 30 days at most.',
        ],
        apres: [
          "Your language choice is kept in your browser's local storage. No advertising or tracking cookie is used.",
        ],
      },
      {
        titre: 'Service providers and hosting location',
        avant: [
          'We rely on service providers to host the application and send emails. They only have access to the information needed for their task.',
          'The list of these providers and the countries where data is hosted will be specified before going live. If information were to be hosted outside Québec, a privacy impact assessment would be carried out first, as required by law.',
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Retention period',
        avant: [],
        liste: [
          'Links sent by email expire: 24 hours to confirm your email, 60 minutes to choose a new password.',
          'A session closes when you sign out, after 7 days without activity, or after 30 days at most.',
          'Account information is kept as long as the account is active. Deletion rules after an account is closed will be specified before going live.',
        ],
        apres: [],
      },
      {
        titre: 'Security',
        avant: [],
        liste: [
          'Encrypted communications (HTTPS).',
          'Passwords stored only as a fingerprint (Argon2id).',
          'Sessions closed immediately when you sign out and when the password is changed.',
          'Limited sign-in attempts, with temporary lockout.',
        ],
        apres: [],
      },
      {
        titre: 'Your rights',
        avant: ['At any time, you can:'],
        liste: [
          'see the information we hold about you;',
          'have it corrected if it is inaccurate or incomplete;',
          'withdraw your consent or ask for your information to be deleted;',
          'receive your information in a structured, commonly used technological format (portability).',
        ],
        apres: [
          'To exercise these rights, write to the person in charge (section 1). We answer within 30 days.',
          "If you are not satisfied with our answer, you can contact the Commission d'accès à l'information du Québec.",
        ],
      },
      {
        titre: 'Confidentiality incident',
        avant: [
          "If an incident presents a risk of serious injury, we promptly notify the Commission d'accès à l'information and the people concerned.",
        ],
        liste: [],
        apres: [],
      },
      {
        titre: 'Changes',
        avant: [
          'The date of the last update is shown at the top of this page. If there is an important change, we will inform you by email.',
        ],
        liste: [],
        apres: [],
      },
    ],
  },
}
