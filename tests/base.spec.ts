import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeAll, afterAll, test } from "vitest";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { McpModule, McpServerService, ModuleRegisterOptions } from "../src";

const firstServerId = "test-server";
const secondServerId = "second-server";

function setTools(mcpServerService: McpServerService) {
  mcpServerService.getServer("test-server")?.tool(
    "calculate",
    {
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      a: z.number(),
      b: z.number(),
    },
    async ({ operation, a, b }) => {
      let result: number;

      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            return {
              content: [{ type: "text", text: "除数不能为零" }],
              isError: true,
            };
          }
          result = a / b;
          break;
        default:
          return {
            content: [{ type: "text", text: "不支持的操作" }],
            isError: true,
          };
      }

      return {
        content: [{ type: "text", text: String(result) }],
      };
    }
  );

  mcpServerService.registerServer({
    serverId: "second-server",
    serverInfo: {
      name: "secondary-mcp-server",
      version: "1.0.0",
    },
  });

  mcpServerService.getServer("second-server")?.tool(
    "get-time",
    {
      format: z.enum(["iso", "locale", "unix"]).optional().default("iso"),
    },
    async ({ format }) => {
      const now = new Date();
      let timeValue: string | number;

      switch (format) {
        case "iso":
          timeValue = now.toISOString();
          break;
        case "locale":
          timeValue = now.toLocaleString();
          break;
        case "unix":
          timeValue = now.getTime();
          break;
        default:
          timeValue = now.toISOString();
      }

      return {
        content: [{ type: "text", text: String(timeValue) }],
      };
    }
  );
}

async function initializeNestApp(
  testPort: number,
  moduleConfigs?: Partial<ModuleRegisterOptions>
) {
  let app: INestApplication;
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      McpModule.register({
        ...moduleConfigs,
        controllerBaseUrl: moduleConfigs?.controllerBaseUrl ?? "/mcp-api",
        mcpServerConfigs: [
          {
            serverId: firstServerId,
            serverInfo: {
              name: "test-mcp-server",
              version: "1.0.0",
            },
          },
          ...(moduleConfigs?.mcpServerConfigs ?? []),
        ],
      }),
    ],
  }).compile();
  app = moduleFixture.createNestApplication();
  await app.init();
  await app.listen(testPort);
  const mcpServerService = app.get(McpServerService);
  setTools(mcpServerService);
  return app;
}

describe("基本流程测试", () => {
  let app: INestApplication;
  const testPort = 3888;

  beforeAll(async () => {
    app = await initializeNestApp(testPort);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("检查 McpServer是否全部注册", async () => {
    const mcpServerService = app.get(McpServerService);
    const serverIds = mcpServerService.getServerIds();
    expect(serverIds).toEqual([firstServerId, secondServerId]);
  });

  it(`应当能连接到McpServer（${firstServerId}）并列出、调用工具`, async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl = new URL(
      `http://localhost:${testPort}/mcp-api/${firstServerId}/sse`
    );
    const transport = new SSEClientTransport(sseUrl);

    await client.connect(transport);
    const tools = await client.listTools();

    expect(tools.tools.length).toEqual(1);
    expect(tools.tools.find(t => t.name === "calculate")).toBeDefined();

    // 测试加法
    const addResult = await client.callTool({
      name: "calculate",
      arguments: { operation: "add", a: 5, b: 3 },
    });

    expect(addResult).toEqual({
      content: [{ type: "text", text: "8" }],
    });

    // 测试除零错误
    const divideByZeroResult = await client.callTool({
      name: "calculate",
      arguments: { operation: "divide", a: 10, b: 0 },
    });

    expect(divideByZeroResult).toEqual({
      content: [{ type: "text", text: "除数不能为零" }],
      isError: true,
    });

    await client.close();
  });

  it(`应当能连接到McpServer（${secondServerId}）并调用工具`, async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl = new URL(
      `http://localhost:${testPort}/mcp-api/${secondServerId}/sse`
    );
    const transport = new SSEClientTransport(sseUrl);

    await client.connect(transport);
    const tools = await client.listTools();

    expect(tools.tools.length).toEqual(1);
    expect(tools.tools[0].name).toEqual("get-time");

    const result = await client.callTool({
      name: "get-time",
      arguments: { format: "unix" },
    });

    expect((result.content as any)[0].type).toEqual("text");
    expect(parseInt((result.content as any)[0].text)).toBeGreaterThan(0);

    await client.close();
  });
});

describe("sseEndpoint和messagesEndpoint测试", () => {
  let app: INestApplication;
  const testPort = 3889;
  const sseEndpoint = "sse-endpoint";
  const messagesEndpoint = "messages-endpoint";

  beforeAll(async () => {
    app = await initializeNestApp(testPort, {
      sseEndpoint,
      messagesEndpoint,
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("应该连接成功", async () => {
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl = new URL(
      `http://localhost:${testPort}/mcp-api/${firstServerId}/${sseEndpoint}`
    );
    const transport = new SSEClientTransport(sseUrl);

    await client.connect(transport);
    const tools = await client.listTools();

    expect(tools.tools.length).toEqual(1);
    expect(tools.tools.find(t => t.name === "calculate")).toBeDefined();

    await client.close();
  });
});
