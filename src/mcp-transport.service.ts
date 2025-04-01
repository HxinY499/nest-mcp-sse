import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Injectable } from "@nestjs/common";

@Injectable()
export class McpTransportService {
  // 使用Map存储所有传输连接，按serverId和sessionId分组
  private transportMap: Map<string, Map<string, SSEServerTransport>> =
    new Map();

  /**
   * 注册传输连接
   * @param serverId
   * @param transport
   */
  registerTransport(serverId: string, transport: SSEServerTransport) {
    if (!this.transportMap.has(serverId)) {
      this.transportMap.set(serverId, new Map());
    }
    this.transportMap.get(serverId)!.set(transport.sessionId, transport);
  }

  /**
   * 移除传输连接
   * @param serverId
   * @param sessionId
   */
  removeTransport(serverId: string, sessionId: string) {
    if (this.transportMap.has(serverId)) {
      this.transportMap.get(serverId)!.delete(sessionId);
    }
  }

  /**
   * 获取特定传输连接
   * @param serverId
   * @param sessionId
   */
  getTransport(
    serverId: string,
    sessionId: string
  ): SSEServerTransport | undefined {
    if (!this.transportMap.has(serverId)) {
      return undefined;
    }
    return this.transportMap.get(serverId)!.get(sessionId);
  }

  /**
   * 获取McpServer的所有活跃会话ID
   * @param serverId
   */
  getActiveSessionIds(serverId: string): string[] {
    if (!this.transportMap.has(serverId)) {
      return [];
    }
    return Array.from(this.transportMap.get(serverId)!.keys());
  }
}
