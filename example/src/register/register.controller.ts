import { Controller } from "@nestjs/common";
import { McpServerService } from "../../../src";
import { z } from "zod";
import { MCP_SERVERS } from "../constant";

@Controller()
export class RegisterController {
  constructor(private readonly mcpServerService: McpServerService) {
    this.registryDateTool();
  }

  private registryDateTool() {
    this.mcpServerService
      .getServer(MCP_SERVERS["from-register-module"].serverId)
      ?.tool(
        "get-current-time-from-register",
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
            content: [
              { type: "text", text: String(timeValue) + " from register" },
            ],
          };
        }
      );
  }
}
