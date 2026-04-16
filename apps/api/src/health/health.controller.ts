import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    const version = process.env.APP_VERSION?.trim() || "dev";
    return { ok: true, service: "taj-api", version };
  }
}
