import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { vechainConfig } from "./config.js";

async function createGitbookMcpClient(docsUrl: string) {
    try {
        let client: Client | undefined = undefined

        client = new Client(
            {
                name: vechainConfig.mcpClient.name,
                version: vechainConfig.mcpClient.version,
            },
            {
                capabilities: {}
            }
        );

        const mcpServerUrl = new URL(`${docsUrl}/~gitbook/mcp`);

        const transport = new StreamableHTTPClientTransport(mcpServerUrl) as Transport;

        await client.connect(transport);

        return {
            client,
            async listTools() {
                const resp = await client.listTools();
                return resp.tools ?? [];
            },
        };
    } catch (error) {
        console.error("Error connecting to GitBookClient:", error);
        throw error;
    }
}

export async function createVechainDocsMcpClient() {
    try {
        const vechainDocsMcpClient = await createGitbookMcpClient(vechainConfig.mcpClient.vechainDocsUrl);
        return vechainDocsMcpClient
    } catch (err) {
        console.error("Error creating VeChain Docs MCP Client:", err);
        throw err;
    }
}