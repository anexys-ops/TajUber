import { IsNotEmpty, IsString, IsUrl } from "class-validator";

export class ConnectOnboardingDto {
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  refreshUrl!: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  returnUrl!: string;
}
