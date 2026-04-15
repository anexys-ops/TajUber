import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/** Photos d’exemple (Unsplash, HTTPS) — OK pour Next/Image avec remotePatterns. */
const IMG = {
  poulet1:
    "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80",
  poulet2:
    "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80",
  tenders:
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80",
  wings:
    "https://images.unsplash.com/photo-1527477391420-25d7dafc6b33?w=800&q=80",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
  wrap:
    "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80",
  frites:
    "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80",
  riz:
    "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800&q=80",
  salade:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
  soda:
    "https://images.unsplash.com/photo-1544145942-a1d38b639493?w=800&q=80",
  jus:
    "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80",
  eau:
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80",
  glace:
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80",
  brownie:
    "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=800&q=80",
  logo:
    "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&q=80",
};

const DEMO_OPENING_HOURS = JSON.stringify({
  mon: { open: "11:30", close: "22:00", closed: false },
  tue: { open: "11:30", close: "22:00", closed: false },
  wed: { open: "11:30", close: "22:00", closed: false },
  thu: { open: "11:30", close: "22:00", closed: false },
  fri: { open: "11:30", close: "23:00", closed: false },
  sat: { open: "11:30", close: "23:00", closed: false },
  sun: { closed: true },
});

async function main() {
  const slug = "taj-poulet-demo";
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    create: {
      slug,
      name: "TAJ Poulet (démo)",
      brandName: "TAJ Poulet",
      primaryColor: "#f59e0b",
      logoUrl: IMG.logo,
      restaurantStreet: "12 rue du Poulet Doré",
      restaurantCity: "Paris",
      restaurantPostalCode: "75011",
      restaurantPhone: "+33 1 23 45 67 89",
      restaurantEmail: "contact@taj-poulet-demo.local",
      restaurantDescription:
        "Poulet rôti et street-food, livraison et click & collect.",
      openingHoursJson: DEMO_OPENING_HOURS,
      deliveryEnabled: true,
      pickupEnabled: true,
      paymentsStripeEnabled: true,
      paymentsCashEnabled: true,
      paymentsQontoEnabled: true,
      paymentsMealVoucherEnabled: true,
      qontoPaymentNote:
        "Virement SEPA sur IBAN FRXX XXXX (compte pro Qonto) — réf. commande.",
      mealVoucherNote: "Edenred, Sodexo, Swile acceptés en caisse.",
    },
    update: {
      name: "TAJ Poulet (démo)",
      brandName: "TAJ Poulet",
      primaryColor: "#f59e0b",
      logoUrl: IMG.logo,
      restaurantStreet: "12 rue du Poulet Doré",
      restaurantCity: "Paris",
      restaurantPostalCode: "75011",
      restaurantPhone: "+33 1 23 45 67 89",
      restaurantEmail: "contact@taj-poulet-demo.local",
      restaurantDescription:
        "Poulet rôti et street-food, livraison et click & collect.",
      openingHoursJson: DEMO_OPENING_HOURS,
      deliveryEnabled: true,
      pickupEnabled: true,
      paymentsStripeEnabled: true,
      paymentsCashEnabled: true,
      paymentsQontoEnabled: true,
      paymentsMealVoucherEnabled: true,
      qontoPaymentNote:
        "Virement SEPA sur IBAN FRXX XXXX (compte pro Qonto) — réf. commande.",
      mealVoucherNote: "Edenred, Sodexo, Swile acceptés en caisse.",
    },
  });

  const passwordPlain =
    process.env.SEED_PASSWORD ?? "ChangeMeDev123!";
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  await prisma.user.upsert({
    where: { email: "owner@taj.local" },
    create: {
      email: "owner@taj.local",
      passwordHash,
      displayName: "Propriétaire plateforme",
      isPlatformOwner: true,
    },
    update: {
      passwordHash,
      isPlatformOwner: true,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@taj.local" },
    create: {
      email: "admin@taj.local",
      passwordHash,
      displayName: "Admin restaurant",
    },
    update: {
      passwordHash,
    },
  });

  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: { userId: adminUser.id, tenantId: tenant.id },
    },
    create: {
      userId: adminUser.id,
      tenantId: tenant.id,
      role: "TENANT_ADMIN",
    },
    update: { role: "TENANT_ADMIN" },
  });

  const posUser = await prisma.user.upsert({
    where: { email: "caisse@taj.local" },
    create: {
      email: "caisse@taj.local",
      passwordHash,
      displayName: "Caisse",
    },
    update: {
      passwordHash,
    },
  });

  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: { userId: posUser.id, tenantId: tenant.id },
    },
    create: {
      userId: posUser.id,
      tenantId: tenant.id,
      role: "STAFF_POS",
    },
    update: { role: "STAFF_POS" },
  });

  const kitchenUser = await prisma.user.upsert({
    where: { email: "cuisine@taj.local" },
    create: {
      email: "cuisine@taj.local",
      passwordHash,
      displayName: "Ligne cuisine",
    },
    update: {
      passwordHash,
    },
  });

  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: { userId: kitchenUser.id, tenantId: tenant.id },
    },
    create: {
      userId: kitchenUser.id,
      tenantId: tenant.id,
      role: "KITCHEN",
    },
    update: { role: "KITCHEN" },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: "livreur@taj.local" },
    create: {
      email: "livreur@taj.local",
      passwordHash,
      displayName: "Livreur",
    },
    update: {
      passwordHash,
    },
  });

  await prisma.userTenant.upsert({
    where: {
      userId_tenantId: { userId: driverUser.id, tenantId: tenant.id },
    },
    create: {
      userId: driverUser.id,
      tenantId: tenant.id,
      role: "DRIVER",
    },
    update: { role: "DRIVER" },
  });

  await prisma.menuItem.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.menuItem.createMany({
    data: [
      {
        tenantId: tenant.id,
        category: "Plats signature",
        name: "Poulet rôti demi",
        description: "Poulet fermier doré, herbes de Provence",
        priceCents: 1290,
        photoUrl: IMG.poulet1,
        sortOrder: 10,
      },
      {
        tenantId: tenant.id,
        category: "Plats signature",
        name: "Poulet rôti entier",
        description: "À partager (2–3 pers.)",
        priceCents: 2290,
        photoUrl: IMG.poulet2,
        sortOrder: 11,
      },
      {
        tenantId: tenant.id,
        category: "Plats signature",
        name: "Tenders x6",
        description: "Croustillants, sauce au choix",
        priceCents: 890,
        photoUrl: IMG.tenders,
        sortOrder: 12,
      },
      {
        tenantId: tenant.id,
        category: "Plats signature",
        name: "Ailes BBQ x8",
        description: "Glacées sauce maison",
        priceCents: 950,
        photoUrl: IMG.wings,
        sortOrder: 13,
      },
      {
        tenantId: tenant.id,
        category: "Sandwichs",
        name: "Burger poulet croustillant",
        description: "Salade, tomate, sauce Taj",
        priceCents: 990,
        photoUrl: IMG.burger,
        sortOrder: 20,
      },
      {
        tenantId: tenant.id,
        category: "Sandwichs",
        name: "Wrap poulet grillé",
        description: "Tortilla, légumes croquants",
        priceCents: 850,
        photoUrl: IMG.wrap,
        sortOrder: 21,
      },
      {
        tenantId: tenant.id,
        category: "Accompagnements",
        name: "Frites maison",
        description: "Gros sel, portion généreuse",
        priceCents: 390,
        photoUrl: IMG.frites,
        sortOrder: 30,
      },
      {
        tenantId: tenant.id,
        category: "Accompagnements",
        name: "Riz pilaf",
        description: "Beurre clarifié, épices douces",
        priceCents: 350,
        photoUrl: IMG.riz,
        sortOrder: 31,
      },
      {
        tenantId: tenant.id,
        category: "Accompagnements",
        name: "Salade fraîche",
        description: "Vinaigrette citron",
        priceCents: 420,
        photoUrl: IMG.salade,
        sortOrder: 32,
      },
      {
        tenantId: tenant.id,
        category: "Boissons",
        name: "Soda 33 cl",
        description: "Au choix",
        priceCents: 290,
        photoUrl: IMG.soda,
        sortOrder: 40,
      },
      {
        tenantId: tenant.id,
        category: "Boissons",
        name: "Jus de mangue",
        description: "Frais",
        priceCents: 390,
        photoUrl: IMG.jus,
        sortOrder: 41,
      },
      {
        tenantId: tenant.id,
        category: "Boissons",
        name: "Eau minérale",
        description: "50 cl",
        priceCents: 190,
        photoUrl: IMG.eau,
        sortOrder: 42,
      },
      {
        tenantId: tenant.id,
        category: "Desserts",
        name: "Glace vanille caramel",
        description: "Coulis maison",
        priceCents: 490,
        photoUrl: IMG.glace,
        sortOrder: 50,
      },
      {
        tenantId: tenant.id,
        category: "Desserts",
        name: "Brownie chocolat",
        description: "Noisettes torréfiées",
        priceCents: 450,
        photoUrl: IMG.brownie,
        sortOrder: 51,
      },
      {
        tenantId: tenant.id,
        category: "Menu enfant",
        name: "Menu enfant tenders",
        description: "3 tenders + petite frite + jus",
        priceCents: 790,
        photoUrl: IMG.tenders,
        sortOrder: 60,
      },
    ],
  });

  await prisma.promotion.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.promotion.createMany({
    data: [
      {
        tenantId: tenant.id,
        title: "Midi -10 %",
        description: "Du lundi au vendredi 11h–14h sur les plats signature",
        percentOff: 10,
        active: true,
      },
      {
        tenantId: tenant.id,
        title: "Menu duo",
        description: "2 menus sandwich + 2 boissons : -15 %",
        percentOff: 15,
        active: true,
      },
    ],
  });

  await prisma.platformSubscriptionPlan.upsert({
    where: { id: "plan-starter" },
    create: {
      id: "plan-starter",
      name: "Starter",
      description: "Abonnement mensuel plateforme (exemple)",
      priceCents: 4900,
      currency: "eur",
    },
    update: {},
  });

  console.log("Seed OK — tenant:", slug);
  console.log(
    "Mot de passe (SEED_PASSWORD ou ChangeMeDev123!) — admin@taj.local, caisse@taj.local, cuisine@taj.local, livreur@taj.local ; owner@taj.local (plateforme, sans tenantSlug)",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
