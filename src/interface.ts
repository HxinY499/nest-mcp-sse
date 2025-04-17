import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";

export interface McpServerConfig {
  serverId: string;
  serverInfo: Implementation;
  serverOptions?: ServerOptions;
}

export interface ModuleRegisterOptions {
  mcpServerConfigs?: McpServerConfig[];
  controllerBaseUrl: string;
  sseEndpoint?: string;
  messagesEndpoint?: string;
  log?: boolean;
}
