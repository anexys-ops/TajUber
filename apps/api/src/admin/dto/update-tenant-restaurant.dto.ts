import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateTenantRestaurantDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  restaurantStreet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  restaurantCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  restaurantPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  restaurantCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  restaurantPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  restaurantEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  restaurantDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  openingHoursJson?: string;

  @IsOptional()
  @IsBoolean()
  deliveryEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsStripeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsCashEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsQontoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsMealVoucherEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qontoPaymentNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mealVoucherNote?: string;
}
