import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { MCP_SERVERS } from "./constant";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3009;
  await app.listen(port, "0.0.0.0", () => {
    // console.log(`服务已启动，运行地址： http://127.0.0.1:${port}`);
    Object.values(MCP_SERVERS).forEach(server => {
      console.log(
        `mcp server [${server.serverInfo.name}] 已启动： http://127.0.0.1:${port}${server.controllerUrl}/${server.serverId}/sse`
      );
    });
  });
}
bootstrap();
