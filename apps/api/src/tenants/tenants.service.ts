import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@taj/database";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        brandName: true,
        subscriptionStatus: true,
        platformFeePercent: true,
        stripeConnectChargesEnabled: true,
        createdAt: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  async create(data: {
    slug: string;
    name: string;
    brandName?: string;
    platformFeePercent?: number;
  }) {
    const slug = data.slug.trim().toLowerCase();
    const exists = await this.prisma.tenant.findUnique({ where: { slug } });
    if (exists) {
      throw new ConflictException(`Le slug « ${slug} » est déjà utilisé`);
    }

    return this.prisma.tenant.create({
      data: {
        slug,
        name: data.name,
        brandName: data.brandName,
        platformFeePercent:
          data.platformFeePercent !== undefined
            ? new Prisma.Decimal(data.platformFeePercent)
            : undefined,
      },
    });
  }
}
