import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { McpModule, McpTransportService } from "../src";

const serverId = "transport-test-server";

describe("McpTransportService 测试", () => {
  let app: INestApplication;
  const testPort = 3893;
  const baseUrl = "/mcp-api-transport";
  let mcpTransportService: McpTransportService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        McpModule.register({
          controllerBaseUrl: baseUrl,
          mcpServerConfigs: [
            {
              serverId,
              serverInfo: {
                name: "transport-test-mcp-server",
                version: "1.0.0",
              },
            },
          ],
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(testPort);

    mcpTransportService = app.get(McpTransportService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("初始状态应无活跃会话", () => {
    const sessions = mcpTransportService.getActiveSessionIds(serverId);
    expect(sessions).toEqual([]);
  });

  it("客户端连接后应有活跃会话", async () => {
    // 首先连接客户端
    const client = new Client(
      { name: "transport-test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl = new URL(
      `http://localhost:${testPort}${baseUrl}/${serverId}/sse`
    );
    const transport = new SSEClientTransport(sseUrl);

    await client.connect(transport);

    const sessions = mcpTransportService.getActiveSessionIds(serverId);
    expect(sessions.length).toEqual(1);

    const sessionId = sessions[0];
    const transportInstance = mcpTransportService.getTransport(
      serverId,
      sessionId
    );
    expect(transportInstance).toBeDefined();

    await client.close();

    // 确保连接关闭处理完成
    await new Promise(resolve => setTimeout(resolve, 100));

    const sessionsAfterClose =
      mcpTransportService.getActiveSessionIds(serverId);
    expect(sessionsAfterClose).toEqual([]);
  });

  it("多个客户端连接时应正确管理会话", async () => {
    const client1 = new Client(
      { name: "transport-test-client-1", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl1 = new URL(
      `http://localhost:${testPort}${baseUrl}/${serverId}/sse`
    );
    const transport1 = new SSEClientTransport(sseUrl1);

    const client2 = new Client(
      { name: "transport-test-client-2", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl2 = new URL(
      `http://localhost:${testPort}${baseUrl}/${serverId}/sse`
    );
    const transport2 = new SSEClientTransport(sseUrl2);

    await client1.connect(transport1);
    await client2.connect(transport2);

    const sessions = mcpTransportService.getActiveSessionIds(serverId);
    expect(sessions.length).toEqual(2);

    await client1.close();

    await new Promise(resolve => setTimeout(resolve, 100));

    const sessionsAfterClose =
      mcpTransportService.getActiveSessionIds(serverId);
    expect(sessionsAfterClose.length).toEqual(1);

    await client2.close();

    await new Promise(resolve => setTimeout(resolve, 100));

    const sessionsAfterAllClose =
      mcpTransportService.getActiveSessionIds(serverId);
    expect(sessionsAfterAllClose).toEqual([]);
  });

  it("不存在的服务器ID应返回空会话列表", () => {
    const sessions = mcpTransportService.getActiveSessionIds(
      "non-existent-server"
    );
    expect(sessions).toEqual([]);
  });

  it("不存在的会话ID应返回undefined", () => {
    const transport = mcpTransportService.getTransport(
      serverId,
      "non-existent-session"
    );
    expect(transport).toBeUndefined();
  });
});

describe("McpTransportService多服务测试", () => {
  const testPort = 3894;
  const baseUrl = "/mcp-api-transport-integration";
  const rootServerId = "root-transport-server";
  const featureServerId = "feature-transport-server";

  it("应当能够通过 register 方法注册多个McpServer并连接", async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        McpModule.register({
          controllerBaseUrl: baseUrl,
          mcpServerConfigs: [
            {
              serverId: rootServerId,
              serverInfo: {
                name: "root-transport-mcp-server",
                version: "1.0.0",
              },
            },
            {
              serverId: featureServerId,
              serverInfo: {
                name: "feature-transport-mcp-server",
                version: "1.0.0",
              },
            },
          ],
        }),
      ],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(testPort);

    try {
      const mcpTransportService = app.get(McpTransportService);
      expect(mcpTransportService.getActiveSessionIds(rootServerId)).toEqual([]);
      expect(mcpTransportService.getActiveSessionIds(featureServerId)).toEqual(
        []
      );
      const client1 = new Client(
        { name: "root-client", version: "1.0.0" },
        { capabilities: {} }
      );

      const sseUrl1 = new URL(
        `http://localhost:${testPort}${baseUrl}/${rootServerId}/sse`
      );
      const transport1 = new SSEClientTransport(sseUrl1);
      await client1.connect(transport1);

      const rootSessions =
        mcpTransportService.getActiveSessionIds(rootServerId);
      expect(rootSessions.length).toEqual(1);

      await client1.close();

      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      await app.close();
    }
  });
});
