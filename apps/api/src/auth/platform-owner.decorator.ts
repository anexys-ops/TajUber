import { SetMetadata } from "@nestjs/common";

export const PLATFORM_OWNER_KEY = "platformOwner";

export const RequirePlatformOwner = () =>
  SetMetadata(PLATFORM_OWNER_KEY, true);
