import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeEventsListener } from "./realtime.listener";

@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, RealtimeEventsListener],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
