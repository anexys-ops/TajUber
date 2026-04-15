import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

export class BillingCheckoutDto {
  @IsString()
  @IsNotEmpty()
  stripePriceId!: string;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;
}
