import { Module } from "@nestjs/common";
import { RegisterController } from "./register.controller";
import { McpModule } from "../../../src";
import { MCP_SERVERS } from "../constant";

@Module({
  imports: [
    McpModule.register({
      controllerBaseUrl: MCP_SERVERS["from-register-module"].controllerUrl,
      mcpServerConfigs: [
        {
          serverId: MCP_SERVERS["from-register-module"].serverId,
          serverInfo: {
            name: "from-register-module-server",
            version: "1.0.0",
          },
        },
      ],
    }),
  ],
  controllers: [RegisterController],
  providers: [],
})
export class RegisterModule {}
