import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Injectable, Logger } from "@nestjs/common";

import { McpServerConfig } from "./interface";

@Injectable()
export class McpServerService {
  private readonly servers: Map<string, McpServer> = new Map();
  private readonly logger = new Logger(McpServerService.name);

  constructor() {}

  registerServer(mcpServerConfig: McpServerConfig): McpServer {
    const { serverId, serverInfo, serverOptions } = mcpServerConfig;
    if (this.servers.has(serverId)) {
      return this.servers.get(serverId) as McpServer;
    }

    const server = new McpServer(serverInfo, serverOptions);
    this.servers.set(serverId, server);
    this.logger.log(`MCP Server '${serverId}' registered`);
    return server;
  }

  /**
   * 连接McpServer到传输层
   * @param serverId Server ID
   * @param transport Transport instance
   */
  async connect(
    serverId: string,
    transport: SSEServerTransport
  ): Promise<void> {
    const server = this.getServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    await server.connect(transport);
  }

  /**
   * 获取指定McpServer实例
   * @param serverId
   */
  getServer(serverId: string): McpServer | undefined {
    return this.servers.get(serverId);
  }

  /**
   * 获取所有已注册的Server ID
   */
  getServerIds(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * 检查McpServer是否已注册
   * @param serverId Server ID
   */
  hasServer(serverId: string): boolean {
    return this.servers.has(serverId);
  }
}
