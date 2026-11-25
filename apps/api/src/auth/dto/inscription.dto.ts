import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  courrielNormalise,
  sansEspacesAutour,
} from '../../commun/transformations.js';

/**
 * Données reçues pour créer une entreprise et son administrateur.
 * @ApiProperty → documentation Swagger ; @Transform → nettoyage ; @Is…/@Max… → règles de validation.
 */
export class InscriptionDto {
  @ApiProperty({ example: 'Plomberie Tremblay', maxLength: 200 })
  @Transform(sansEspacesAutour)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nomEntreprise: string;

  @ApiProperty({ example: 'Marie', maxLength: 100 })
  @Transform(sansEspacesAutour)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  prenom: string;

  @ApiProperty({ example: 'Tremblay', maxLength: 100 })
  @Transform(sansEspacesAutour)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom: string;

  @ApiProperty({ example: 'marie@plomberie-tremblay.ca', maxLength: 254 })
  @Transform(courrielNormalise)
  @IsEmail()
  @MaxLength(254)
  courriel: string;

  // 128 au plus : un mot de passe énorme ralentirait le hachage (déni de service).
  @ApiProperty({ example: 'un-mot-de-passe-solide', minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  motDePasse: string;

  // Consentement obligatoire (Loi 25) : seule la valeur true est acceptée.
  @ApiProperty({
    example: true,
    description: "Acceptation des conditions d'utilisation et de la politique de confidentialité",
  })
  @Equals(true)
  accepteConditions: boolean;
}
