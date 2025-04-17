import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
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
  messagesEndpoint = "messages",
  log = true
) {
  @Controller(controllerBaseUrl)
  class McpController {
    readonly logger = new Logger(McpController.name);
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
        const errorMessage = `MCP Server '${targetServerId}' not found`;
        if (log) {
          this.logger.error(errorMessage);
        }
        res.status(404).send(errorMessage);
        return;
      }
      const transport = new SSEServerTransport(messagesEndpoint, res);
      const sessionId = transport.sessionId;

      this.transportService.registerTransport(targetServerId, transport);

      res.on("close", () => {
        if (log) {
          this.logger.log(
            `MCP Server '${targetServerId}' disconnected, sessionId: ${sessionId}`
          );
        }
        this.transportService.removeTransport(targetServerId, sessionId);
      });

      if (log) {
        this.logger.log(
          `MCP Server '${targetServerId}' connected, sessionId: ${sessionId}`
        );
      }
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
        const errorMessage = `MCP Server '${targetServerId}' not found`;
        if (log) {
          this.logger.error(errorMessage);
        }
        res.status(404).send(errorMessage);
        return;
      }

      if (!sessionId) {
        const errorMessage = "Missing sessionId query parameter";
        if (log) {
          this.logger.error(errorMessage);
        }
        res.status(400).send(errorMessage);
        return;
      }

      const transport = this.transportService.getTransport(
        targetServerId,
        sessionId
      );
      if (!transport) {
        const errorMessage = `No active transport found for serverID: ${targetServerId}, sessionID: ${sessionId}`;
        if (log) {
          this.logger.error(errorMessage);
        }
        res.status(404).send(errorMessage);
        return;
      }

      if (log) {
        this.logger.log(
          `MCP Server '${targetServerId}' received message, sessionId: ${sessionId}`
        );
      }
      await transport.handlePostMessage(req, res, body);
    }
  }

  return McpController;
}
