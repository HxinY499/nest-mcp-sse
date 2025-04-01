import { INestApplication, Injectable, Module } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import { McpModule, McpServerService } from "../src";

const globalServerId = "global-server";
const globalServerName = "global-mcp-server";

const registerServerId = "register-server";
const registerServerName = "register-mcp-server";

function setupCalculateTool(
  mcpServerService: McpServerService,
  serverId: string
) {
  mcpServerService.getServer(serverId)?.tool(
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
}

describe("多模块独立性测试", () => {
  let globalApp: INestApplication;
  let registerApp: INestApplication;
  const globalPort = 3894;
  const registerPort = 3895;
  const globalBaseUrl = "/global-api";
  const registerBaseUrl = "/register-api";

  beforeAll(async () => {
    // 创建全局应用
    const globalModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        McpModule.forRoot({
          controllerBaseUrl: globalBaseUrl,
          mcpServerConfigs: [
            {
              serverId: globalServerId,
              serverInfo: {
                name: globalServerName,
                version: "1.0.0",
              },
            },
          ],
        }),
      ],
    }).compile();

    globalApp = globalModuleFixture.createNestApplication();
    await globalApp.init();
    await globalApp.listen(globalPort);

    // 创建独立应用
    const registerModuleFixture: TestingModule = await Test.createTestingModule(
      {
        imports: [
          McpModule.register({
            controllerBaseUrl: registerBaseUrl,
            mcpServerConfigs: [
              {
                serverId: registerServerId,
                serverInfo: {
                  name: registerServerName,
                  version: "1.0.0",
                },
              },
            ],
          }),
        ],
      }
    ).compile();

    registerApp = registerModuleFixture.createNestApplication();
    await registerApp.init();
    await registerApp.listen(registerPort);

    const globalMcpService = globalApp.get(McpServerService);
    setupCalculateTool(globalMcpService, globalServerId);

    const registerMcpService = registerApp.get(McpServerService);
    setupCalculateTool(registerMcpService, registerServerId);
  });

  afterAll(async () => {
    if (globalApp) await globalApp.close();
    if (registerApp) await registerApp.close();
  });

  it("全局应用中的 McpServerService 应只包含全局服务器", async () => {
    const mcpServerService = globalApp.get(McpServerService);
    const serverIds = mcpServerService.getServerIds();

    expect(serverIds).toContain(globalServerId);
    expect(serverIds.length).toEqual(1);

    expect(serverIds).not.toContain(registerServerId);
  });

  it("独立应用中的 McpServerService 应只包含独立服务器", async () => {
    const mcpServerService = registerApp.get(McpServerService);
    const serverIds = mcpServerService.getServerIds();

    expect(serverIds).toContain(registerServerId);
    expect(serverIds.length).toEqual(1);

    expect(serverIds).not.toContain(globalServerId);
  });

  it("应当能访问全局应用中的服务器", async () => {
    const client = new Client(
      { name: "global-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl = new URL(
      `http://localhost:${globalPort}${globalBaseUrl}/${globalServerId}/sse`
    );
    const transport = new SSEClientTransport(sseUrl);

    await client.connect(transport);
    const tools = await client.listTools();

    expect(tools.tools.length).toEqual(1);
    expect(tools.tools.find(t => t.name === "calculate")).toBeDefined();

    await client.close();
  });

  it("应当能访问独立应用中的服务器", async () => {
    const client = new Client(
      { name: "register-client", version: "1.0.0" },
      { capabilities: {} }
    );

    const sseUrl = new URL(
      `http://localhost:${registerPort}${registerBaseUrl}/${registerServerId}/sse`
    );
    const transport = new SSEClientTransport(sseUrl);

    await client.connect(transport);
    const tools = await client.listTools();

    expect(tools.tools.length).toEqual(1);
    expect(tools.tools.find(t => t.name === "calculate")).toBeDefined();

    await client.close();
  });
});
