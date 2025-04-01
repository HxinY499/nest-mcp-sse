import { Module } from "@nestjs/common";
import { McpModule } from "../../src";
import { FeatureModule } from "./feature/feature.module";
import { RegisterModule } from "./register/register.module";
import { MCP_SERVERS } from "./constant";
import { AppController } from "./app.controller";

@Module({
  imports: [
    McpModule.forRoot({
      controllerBaseUrl: MCP_SERVERS["from-app-module"].controllerUrl,
      mcpServerConfigs: [
        {
          serverId: MCP_SERVERS["from-app-module"].serverId,
          serverInfo: MCP_SERVERS["from-app-module"].serverInfo,
        },
      ],
    }),
    FeatureModule,
    RegisterModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
