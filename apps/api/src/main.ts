import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import type { NextFunction, Request, Response } from "express";
import { json, raw } from "express";
import * as express from "express";
import { join } from "node:path";
import { AppModule } from "./app.module";
import "./tenant/tenant.types";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith("/stripe/webhook")) {
      raw({ type: "application/json" })(req, res, next);
    } else {
      json({ limit: "2mb" })(req, res, next);
    }
  });

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API Taj démarrée sur http://localhost:${port}`);
}

bootstrap();
