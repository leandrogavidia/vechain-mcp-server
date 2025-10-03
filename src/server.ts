import express, { type Request, type Response } from "express";
import cors from "cors";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { z, type ZodRawShape } from "zod";

import { vechainConfig } from "./config.js";
import { toolsPromise, vechainTools } from "./tools.js";
import { buildToolZodMap, parseToolInput } from "./utils.js";

async function createVechainServer() {
  const server = new McpServer(
    {
      name: vechainConfig.mcpServer.name,
      version: vechainConfig.mcpServer.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Goat SDK On-Chain Tools

  const { listOfTools, toolHandler } = await toolsPromise();
  const vechainGoatSdkTools = listOfTools();
  const toolSchemaMap = buildToolZodMap(vechainGoatSdkTools);

  for (const t of vechainGoatSdkTools) {
    const zodSchema = toolSchemaMap.get(t.name) ?? z.object({});

    let inputShape: ZodRawShape = {};

    try {
      const def = (zodSchema as any)?._def;
      if (def && def.typeName === "ZodObject") {
        const shapeFnOrObj = def.shape;
        const shape = typeof shapeFnOrObj === "function" ? shapeFnOrObj() : shapeFnOrObj;
        inputShape = shape as ZodRawShape;
      } else {
        inputShape = {};
      }
    } catch (e) {
      console.error(e)
      inputShape = {};
    }

    server.registerTool(
      t.name,
      {
        title: t.name,
        description: t.description ?? "",
        inputSchema: inputShape,
      },
      async (args) => {
        const parsedArgs = parseToolInput(toolSchemaMap, t.name, args);
        const result = await toolHandler(t.name, parsedArgs);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
    );
  }

  // Thorest API Tools & Custom Tools

  for (const t of vechainTools) {
    server.registerTool(
      t.name,
      {
        title: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      },
      async (args) => {
        const result = await t.callback(args);
        return {
          content: result.content.map(item => ({
            ...item,
            type: "text" as const
          }))
        };
      }
    );
  }

  return server;
}

export async function start() {
  const useStreamHttp = process.env.USE_STREAMABLE_HTTP === "true";
  const useStdIO = !useStreamHttp;
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const server = await createVechainServer();

  if (useStdIO) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("VeChain MCP Server running on stdio");
    console.log(`Mode: ${process.env.ENVIRONMENT === "MAINNET" ? "Mainnet" : "Testnet"}`);
    return;
  }

  const app = express();
  app.use(express.json());

  app.use(
    cors({
      origin: "*",
      allowedHeaders: ["Content-Type", "mcp-session-id"],
    })
  );

  app.post("/mcp", async (req: Request, res: Response) => {
    try {
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        enableDnsRebindingProtection: true,
        sessionIdGenerator: undefined,
      });

      res.on('close', () => {
        console.log('Request closed');
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    }));
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed."
      },
      id: null
    }));
  });

  app.get("/health", (_req, res) => res.status(200).send("ok"));

  app.listen(port, host, () => {
    console.log(`MCP Stateless Streamable HTTP listening on http://${host}:${port}`);
    console.log(`Mode: ${process.env.ENVIRONMENT === "MAINNET" ? "Mainnet" : "Testnet"}`);
  });
}