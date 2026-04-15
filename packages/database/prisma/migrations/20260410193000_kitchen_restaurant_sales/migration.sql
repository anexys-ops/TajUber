-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('STRIPE', 'CASH', 'MEAL_VOUCHER', 'QONTO', 'OTHER');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "restaurantStreet" TEXT,
ADD COLUMN "restaurantCity" TEXT,
ADD COLUMN "restaurantPostalCode" TEXT,
ADD COLUMN "restaurantCountry" TEXT DEFAULT 'FR',
ADD COLUMN "restaurantPhone" TEXT,
ADD COLUMN "restaurantEmail" TEXT,
ADD COLUMN "restaurantDescription" TEXT,
ADD COLUMN "openingHoursJson" TEXT,
ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "paymentsStripeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "paymentsCashEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "paymentsQontoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "paymentsMealVoucherEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "qontoPaymentNote" TEXT,
ADD COLUMN "mealVoucherNote" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "deliveryInstructions" TEXT,
ADD COLUMN "deliveryCity" TEXT,
ADD COLUMN "deliveryPostalCode" TEXT,
ADD COLUMN "orderSource" TEXT NOT NULL DEFAULT 'pos',
ADD COLUMN "paymentMethod" "OrderPaymentMethod";
