import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Tenant } from "@taj/database";
import { diskStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentTenant } from "../tenant/current-tenant.decorator";

const UPLOAD_ROOT = join(process.cwd(), "uploads");

@Controller("admin/media")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("TENANT_ADMIN")
export class MediaController {
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_ROOT, { recursive: true });
          cb(null, UPLOAD_ROOT);
        },
        filename: (_req, file, cb) => {
          const ext = file.originalname.includes(".")
            ? file.originalname.slice(file.originalname.lastIndexOf("."))
            : "";
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentTenant() tenant: Tenant,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.filename) {
      throw new BadRequestException("Fichier manquant");
    }
    const publicPath = `/uploads/${file.filename}`;
    return {
      url: publicPath,
      tenantId: tenant.id,
      filename: file.filename,
    };
  }
}
