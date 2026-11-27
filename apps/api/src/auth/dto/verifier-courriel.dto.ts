import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Le jeton reçu dans le lien du courriel. */
export class VerifierCourrielDto {
  @ApiProperty({ description: 'Le jeton du lien (après « jeton= »)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  jeton: string;
}
