import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  /** Obligatoire pour le personnel restaurant (sauf compte plateforme). */
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}
