# nest-mcp-sse

这是一个用于在 NestJS 工程下快速开发 SSE 传输类型 McpServer 的动态模块，使用此模块，你将无需理会连接 Transport、生命周期管理、McpServer 实例化等杂事，聚焦于 MCP tool 的开发。

**此模块没有过度封装**🥳

只做了 MCP Server 实例管理和 SSE Transport 管理，没有对官方 sdk 的原生 MCP Server 的方法做任何封装，尽可能不增加学习成本。

## 功能特点

- 快速在 NestJS 应用中创建 MCP 服务器
- 支持多个 MCP Server 实例管理
- 自动处理 SSE 连接生命周期

## 安装

```bash
# npm
npm install nest-mcp-sse @modelcontextprotocol/sdk zod

# yarn
yarn add nest-mcp-sse @modelcontextprotocol/sdk zod

# pnpm
pnpm add nest-mcp-sse @modelcontextprotocol/sdk zod
```

## 用法

### 1. 导入模块

在你的模块中导入 `McpModule`

```typescript
import { Module } from "@nestjs/common";
import { McpModule } from "nest-mcp-sse";

@Module({
  imports: [
    McpModule.register({
      controllerBaseUrl: "api/mcp",
      mcpServerConfigs: [
        {
          serverId: "my-mcp-server",
          serverInfo: {
            name: "my-mcp-server",
            version: "1.0.0",
          },
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

另外，你也可以通过`forRoot`和`forFeature`导入模块，区别如下：

- forRoot：通常在根模块注册
- forFeature：和 forRoot 注册的模块共享 Service 实例
- register：用一次注册一次，不和任何模块共享

### 2. 操作 McpServer

创建 MCP Server 之后，你可以通过`getServer`方法获取到官方 sdk 的原生 MCP Server 实例，这个实例没有任何封装，完全是原生的。

比如，你可以注册工具

```ts
import { Controller } from "@nestjs/common";
import { McpServerService } from "nest-mcp-sse";
import { z } from "zod";

@Controller()
export class AppController {
  constructor(private readonly mcpServerService: McpServerService) {
    this.mcpServerService.getServer("server-id")?.tool(
      "get-current-time",
      {
        format: z
          .enum(["iso", "locale", "unix"])
          .optional()
          .default("iso")
          .describe("时间格式: iso, locale, 或 unix"),
      },
      async ({ format }: { format: "iso" | "locale" | "unix" }) => {
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
}
```

### 3. 手动注册服务器实例

上面的例子直接在`McpModule.register`中传入了`mcpServerConfigs`，这会在模块初始化时就创建 MCP Server。

当然这不是必需的，你可以不传入`mcpServerConfigs`，在 Controller 或 Service 中手动注册 MCP Server：

```typescript
import { Controller } from "@nestjs/common";
import { McpServerService } from "nest-mcp-sse";
import { z } from "zod";

@Controller()
export class AppController {
  constructor(private readonly mcpServerService: McpServerService) {
    // 手动注册一个MCP Server实例
    this.mcpServerService.registerServer({
      serverId: "another-server",
      serverInfo: {
        name: "another-mcp-server",
        version: "1.0.0",
      },
    });
  }
}
```

## 服务器访问端点

注册模块后，将自动创建以下端点：

- **SSE 连接端点**: `/{controllerBaseUrl}/{serverId}/sse`
- **消息处理端点**: `/{controllerBaseUrl}/{serverId}/messages`

例如，如果你使用 `controllerBaseUrl: 'api/mcp'` 和 `serverId: 'my-mcp-server'`，则访问 URL 为：

- `http://localhost:3000/api/mcp/my-mcp-server/sse` - 用于 SSE 连接
- `http://localhost:3000/api/mcp/my-mcp-server/messages` - 用于消息处理

## API

### McpModule.register

- **controllerBaseUrl**：MCP Controller 的基本 URL 路径
- **sseEndpoint**：SSE 连接端点名称，默认为 `sse`
- **messagesEndpoint**：消息处理端点名称，默认为 `messages`
- **mcpServerConfigs**：
  - serverId：McpServer id，使用 id 来管理多个实例
  - serverInfo：作为第一个参数，直接传入原生 [MCP TS-SDK 的 McpServer 类](https://github.com/modelcontextprotocol/typescript-sdk)
  - serverOptions: 作为第二个参数，直接传入原生 [MCP TS-SDK 的 McpServer 类](https://github.com/modelcontextprotocol/typescript-sdk)

forRoot 同 register，forFeature 只接收 mcpServerConfigs

### McpServerService

McpModule 导出的 Service，用于管理多个 McpServer 实例。

你可以注入到你的 Controller 或 Service 中，使用以下方法：

#### registerServer

- 作用：注册一个 McpServer 实例
- 参数：同`McpModule.forRoot`的`mcpServerConfigs`
- 返回值：注册的 McpServer 实例

#### getServer

- 作用：获取指定 McpServer 实例
- 参数：serverId
- 返回值：McpServer 实例

#### getServerIds

- 作用：获取所有已注册的 McpServer 实例 id
- 返回值：`string[]` 所有已注册的 McpServer 实例 id 数组

#### hasServer

- 作用：判断是否已注册指定 McpServer 实例
- 参数：serverId
- 返回值：boolean

#### connect

- 作用：连接 McpServer 到传输层，一般不需要使用，除非你希望手动管理连接。
- 参数：
  - serverId
  - transport，Transport 实例
- 返回值：void

### McpTransportService

McpModule 导出的 Service，用于管理多个 SSEServerTransport 实例。

通常不需要使用，除非你希望手动管理连接。

以下仅列出可能使用到的方法，更多方法请参阅源码

#### getTransport

- 作用：获取特定传输连接
- 参数：serverId，sessionId
- 返回值：SSEServerTransport 实例

#### getActiveSessionIds

- 作用：获取 McpServer 的所有活跃会话 ID
- 参数：serverId
- 返回值：`string[]` 所有活跃会话 ID 数组

## 高级配置

### 自定义端点名称

你可以在模块注册时自定义 SSE 和消息端点名称：

```typescript
McpModule.register({
  controllerBaseUrl: "api/mcp",
  sseEndpoint: "connect", // 默认为 'sse'
  messagesEndpoint: "rpc", // 默认为 'messages'
  mcpServerConfigs: [
    /* ... */
  ],
});
```

## 示例代码

你可以 clone 该仓库，按以下步骤运行示例代码

```bash
pnpm install

cd example

pnpm install

pnpm start
```
