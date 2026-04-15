import { OrderStatus } from "@taj/database";
import { IsEnum } from "class-validator";

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
