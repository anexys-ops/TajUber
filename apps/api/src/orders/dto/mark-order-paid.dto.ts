import { IsEnum } from "class-validator";
import { OrderPaymentMethod } from "@taj/database";

export class MarkOrderPaidDto {
  @IsEnum(OrderPaymentMethod)
  paymentMethod!: OrderPaymentMethod;
}
