import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminMenuController } from "./admin-menu.controller";
import { AdminPromotionsController } from "./admin-promotions.controller";
import { AdminDriversController } from "./admin-drivers.controller";
import { AdminRestaurantController } from "./admin-restaurant.controller";
import { AdminSalesController } from "./admin-sales.controller";

@Module({
  imports: [AuthModule],
  controllers: [
    AdminMenuController,
    AdminPromotionsController,
    AdminDriversController,
    AdminRestaurantController,
    AdminSalesController,
  ],
})
export class AdminModule {}
