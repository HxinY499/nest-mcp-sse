import { Controller } from "@nestjs/common";
import { McpServerService } from "../../src";
import { z } from "zod";
import { MCP_SERVERS } from "./constant";
@Controller()
export class AppController {
  constructor(private readonly mcpServerService: McpServerService) {
    this.registryDateTool();
    this.mcpServerService.registerServer({
      serverId: MCP_SERVERS["from-app-controller"].serverId,
      serverInfo: MCP_SERVERS["from-app-controller"].serverInfo,
    });
    this.registryAddTool();
  }

  private registryDateTool() {
    this.mcpServerService
      .getServer(MCP_SERVERS["from-app-module"].serverId)
      ?.tool(
        "get-current-time",
        {
          format: z
            .enum(["iso", "locale", "unix"])
            .optional()
            .default("iso")
            .describe("时间格式: iso, locale, 或 unix"),
        },
        async ({ format }: { format: "iso" | "locale" | "unix" }) => {
          let timeValue: string | number;
          const now = new Date();

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

  private registryAddTool() {
    this.mcpServerService
      .getServer(MCP_SERVERS["from-app-controller"].serverId)
      ?.tool(
        "add",
        {
          a: z.number(),
          b: z.number(),
        },
        async ({ a, b }: { a: number; b: number }) => {
          return {
            content: [{ type: "text", text: String(a + b) }],
          };
        }
      );
  }
}
