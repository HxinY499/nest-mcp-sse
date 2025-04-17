import { DynamicModule, Logger, Module } from "@nestjs/common";

import { createController } from "./createController";
import { McpServerConfig, ModuleRegisterOptions } from "./interface";
import { McpServerService } from "./mcp-server.service";
import { McpTransportService } from "./mcp-transport.service";

function createMcpServerServiceInstance(mcpServerConfigs?: McpServerConfig[]) {
  const mcpServerServiceInstance = new McpServerService();
  mcpServerConfigs?.forEach(serverConfig => {
    mcpServerServiceInstance.registerServer(serverConfig);
  });
  return mcpServerServiceInstance;
}
let globalMcpServerServiceInstance;
let globalMcpTransportServiceInstance;
@Module({
  providers: [Logger],
})
export class McpModule {
  static register({
    mcpServerConfigs,
    controllerBaseUrl,
    sseEndpoint,
    messagesEndpoint,
    log,
  }: ModuleRegisterOptions): DynamicModule {
    const controller = createController(
      controllerBaseUrl,
      sseEndpoint,
      messagesEndpoint
    );

    return {
      module: McpModule,
      controllers: [controller],
      providers: [
        {
          provide: McpServerService,
          useValue: createMcpServerServiceInstance(mcpServerConfigs),
        },
        McpTransportService,
      ],
      exports: [McpServerService, McpTransportService],
    };
  }

  static forRoot({
    mcpServerConfigs,
    controllerBaseUrl,
    sseEndpoint,
    messagesEndpoint,
  }: ModuleRegisterOptions): DynamicModule {
    const controller = createController(
      controllerBaseUrl,
      sseEndpoint,
      messagesEndpoint
    );
    return {
      module: McpModule,
      controllers: [controller],
      providers: [
        {
          provide: McpServerService,
          useFactory: () => {
            globalMcpServerServiceInstance =
              createMcpServerServiceInstance(mcpServerConfigs);
            return globalMcpServerServiceInstance;
          },
        },
        {
          provide: McpTransportService,
          useFactory: () => {
            globalMcpTransportServiceInstance = new McpTransportService();
            return globalMcpTransportServiceInstance;
          },
        },
      ],
      exports: [McpServerService, McpTransportService],
    };
  }

  static forFeature(mcpServerConfigs?: McpServerConfig[]): DynamicModule {
    return {
      module: McpModule,
      providers: [
        {
          provide: McpServerService,
          useFactory: (existingMcpServerServiceInstance?: McpServerService) => {
            const ins =
              existingMcpServerServiceInstance ??
              globalMcpServerServiceInstance;

            if (!ins) {
              throw new Error(
                "When using McpModule.forFeature, you must first use McpModule.forRoot"
              );
            }

            mcpServerConfigs?.forEach(serverConfig => {
              ins.registerServer(serverConfig);
            });
            return ins;
          },
          inject: [
            {
              token: McpServerService,
              optional: true,
            },
          ],
        },
        {
          provide: McpTransportService,
          useFactory: (
            existingMcpTransportServiceInstance?: McpTransportService
          ) => {
            const ins =
              existingMcpTransportServiceInstance ??
              globalMcpTransportServiceInstance;
            if (!ins) {
              throw new Error(
                "When using McpModule.forFeature, you must first use McpModule.forRoot"
              );
            }
            return ins;
          },
          inject: [
            {
              token: McpServerService,
              optional: true,
            },
          ],
        },
      ],
      exports: [McpServerService, McpTransportService],
    };
  }
}
