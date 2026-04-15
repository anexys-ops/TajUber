import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StripeModule } from "../stripe/stripe.module";
import { KitchenController } from "../kitchen/kitchen.controller";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [StripeModule, AuthModule],
  controllers: [OrdersController, KitchenController],
  providers: [OrdersService],
})
export class OrdersModule {}
