import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { McpServerService } from "./mcp-server.service";
import { McpTransportService } from "./mcp-transport.service";

export function createController(
  controllerBaseUrl: string,
  sseEndpoint = "sse",
  messagesEndpoint = "messages"
) {
  @Controller(controllerBaseUrl)
  class McpController {
    constructor(
      @Inject(McpTransportService)
      public readonly transportService: McpTransportService,
      @Inject(McpServerService)
      public readonly mcpServerService: McpServerService
    ) {}

    @Get(`:serverId/${sseEndpoint}`)
    async sse(@Res() res: Response, @Param("serverId") serverId: string) {
      const targetServerId = serverId;

      if (!this.mcpServerService.hasServer(targetServerId)) {
        res.status(404).send(`MCP Server '${targetServerId}' not found`);
        return;
      }
      const transport = new SSEServerTransport(messagesEndpoint, res);
      const sessionId = transport.sessionId;

      this.transportService.registerTransport(targetServerId, transport);

      res.on("close", () => {
        this.transportService.removeTransport(targetServerId, sessionId);
      });

      await this.mcpServerService.connect(targetServerId, transport);
    }

    @Post(`:serverId/${messagesEndpoint}`)
    async messages(
      @Req() req: Request,
      @Body() body: any,
      @Res() res: Response,
      @Param("serverId") serverId: string,
      @Query("sessionId") sessionId: string
    ) {
      const targetServerId = serverId;

      if (!this.mcpServerService.hasServer(targetServerId)) {
        res.status(404).send(`MCP Server '${targetServerId}' not found`);
        return;
      }

      if (!sessionId) {
        res.status(400).send("Missing sessionId query parameter");
        return;
      }

      const transport = this.transportService.getTransport(
        targetServerId,
        sessionId
      );
      if (!transport) {
        res
          .status(404)
          .send(
            `No active transport found for serverID: ${targetServerId}, sessionID: ${sessionId}`
          );
        return;
      }

      await transport.handlePostMessage(req, res, body);
    }
  }

  return McpController;
}
