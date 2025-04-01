import { Module } from "@nestjs/common";
import { FeatureController } from "./feature.controller";
import { McpModule } from "../../../src";
import { MCP_SERVERS } from "../constant";

@Module({
  imports: [
    McpModule.forFeature([
      {
        serverId: MCP_SERVERS["from-feature-module"].serverId,
        serverInfo: MCP_SERVERS["from-feature-module"].serverInfo,
      },
    ]),
  ],
  controllers: [FeatureController],
  providers: [],
})
export class FeatureModule {}
