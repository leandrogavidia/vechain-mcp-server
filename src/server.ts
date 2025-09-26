import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { vechainConfig } from "./consts.js";
import { REVISION } from "./types.js";

const server = new McpServer(
  {
    name: "goat-vechain",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Thorest API

// Accounts

server.registerTool(
  "getAccount",
  {
    title: "Retrieve account details",
    description:
      "Get information about a VeChain account/contract by address. Optionally specify a revision (best | justified | finalized | block number | block ID).",
    inputSchema: {
      /**
       * The 20-byte account/contract address.
       * Accepts with or without the 0x prefix.
       * Example: 0x0000000000000000000000000000456E65726779
       * Pattern: ^(0x)?[0-9a-fA-F]{40}$
       */
      address: z
        .string()
        .regex(vechainConfig.general.addressRegex, "Invalid address: expected 20-byte hex, optional 0x prefix")
        .describe("Account/contract address (20-byte hex, with or without 0x prefix)"),

      /**
       * Optional revision selector.
       * - 'best' (default if omitted)
       * - 'justified'
       * - 'finalized'
       * - block number (integer)
       * - block ID (hex string)
       *
       * We allow string or number to keep flexibility with node expectations.
       */
      revision:
        z
          .union([
            z.enum([REVISION.Best, REVISION.Justified, REVISION.Finalized]),
            z.number().int().nonnegative(),
            z
              .string()
              .min(1)
              .describe("Block ID (hex) or block number as string"),
          ])
          .optional()
          .describe(
            "Revision: best | justified | finalized | block number | block ID (hex). If omitted, best is used."
          ),
    },
  },
  async ({ address, revision }) => {
    const normalizedAddress = address.startsWith("0x")
      ? address.toLowerCase()
      : `0x${address.toLowerCase()}`;

    const base = vechainConfig.mainnet.thorestApiBaseUrl;
    const path = `/accounts/${encodeURIComponent(normalizedAddress)}`;
    const qs = new URLSearchParams();
    if (revision !== undefined && revision !== null) {
      qs.set("revision", String(revision));
    }
    const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), vechainConfig.mainnet.controllerAbortTimeout);

    try {
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(
          `VeChain node responded ${res.status} ${res.statusText}${bodyText ? `: ${bodyText}` : ""
          }`
        );
      }

      const data = await res.json();

      if (data == null) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Account not found (or revision not available)",
                  address: normalizedAddress,
                  revision: revision ?? "best",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err: any) {
      const isAbort = err?.name === "AbortError";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: isAbort ? "Request timed out" : "Failed to fetch account",
                reason: String(err?.message ?? err),
                url,
                address: normalizedAddress,
                revision: revision ?? "best",
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
);

// Transactions

server.registerTool(
  "getTransaction",
  {
    title: "Retrieve a transaction by ID",
    description:
      "Get a VeChain transaction by its ID. Optionally include pending txs (meta may be null), return raw hex, or pin to a specific head block.",
    inputSchema: {
      /**
       * Transaction ID (hash).
       * Example: 0xb6b5b47a5eee8b14e5...ca0cef934
       * Pattern: ^0x[0-9a-fA-F]{64}$
       */
      id: z
        .string()
        .regex(vechainConfig.general.txidRegex, "Invalid transaction ID: expected 0x + 64 hex chars")
        .describe("Transaction ID (0x-prefixed 32-byte hex)"),

      /**
       * Include pending transactions.
       * When true, the API may return a tx whose `meta` is null.
       * Default: false
       */
      pending: z
        .boolean()
        .optional()
        .describe("Include pending transactions (meta may be null). Default: false"),

      /**
       * Include the raw transaction (hex-encoded) in the response.
       * Default: false
       */
      raw: z
        .boolean()
        .optional()
        .describe("Include raw hex transaction in response. Default: false"),

      /**
       * Explicitly specify the head block ID to resolve state against.
       * If omitted, the best block is assumed.
       */
      head: z
        .string()
        .optional()
        .describe("Head block ID to use; defaults to best if omitted"),
    },
  },
  async ({ id, pending = false, raw = false, head }) => {
    const base = vechainConfig.mainnet.thorestApiBaseUrl;
    const path = `/transactions/${encodeURIComponent(id)}`;
    const qs = new URLSearchParams();
    if (typeof pending === "boolean") qs.set("pending", String(pending));
    if (typeof raw === "boolean") qs.set("raw", String(raw));
    if (head) qs.set("head", head);
    const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), vechainConfig.mainnet.controllerAbortTimeout);

    try {
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(
          `VeChain node responded ${res.status} ${res.statusText}${
            bodyText ? `: ${bodyText}` : ""
          }`
        );
      }

      const data = await res.json();

      if (data == null) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Transaction not found",
                  id,
                  pending,
                  raw,
                  head: head ?? "best",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err: any) {
      const isAbort = err?.name === "AbortError";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: isAbort ? "Request timed out" : "Failed to fetch transaction",
                reason: String(err?.message ?? err),
                url,
                id,
                pending,
                raw,
                head: head ?? "best",
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
);

// Blocks

server.registerTool(
  "getBlock",
  {
    title: "Get a VeChain block",
    description:
      "Retrieve information about a VeChain block by its revision (block ID, number, or keywords: best | justified | finalized).",
    inputSchema: {
      /**
       * Revision can be one of:
       * - a block ID (hex string)
       * - a block number (integer)
       * - 'best' for latest block
       * - 'justified' for the justified block
       * - 'finalized' for the finalized block
       *
       * Examples: "best", 12345678, "0x0000...".
       */
      revision: z
        .union([
          z.enum([REVISION.Best, REVISION.Justified, REVISION.Finalized]),
          z.number().int().nonnegative(),
          z
            .string()
            .min(1)
            .describe("Block ID (hex) or block number as string"),
        ])
        .describe(
          "Block revision: hex ID, block number, or keywords: best | justified | finalized"
        ),

      /**
       * Whether the returned block is expanded.
       * - true: transactions are full objects with details and outputs
       * - false: transactions are returned as an array of transaction IDs (hex strings)
       *
       * Default: false
       */
      expanded: z
        .boolean()
        .optional()
        .describe(
          "Return transactions expanded (objects) instead of just IDs (default: false)"
        ),

      /**
       * Whether the block should be returned in RLP encoding.
       * - true: block is returned as an RLP encoded object
       * - false: block is returned as a structured JSON object
       *
       * Default: false
       */
      raw: z
        .boolean()
        .optional()
        .describe("Return RLP-encoded block instead of structured JSON (default: false)"),
    },
  },
  async ({ revision, expanded = false, raw = false }) => {
    const base = vechainConfig.mainnet.thorestApiBaseUrl;
    const path = `/blocks/${encodeURIComponent(String(revision))}`;
    const qs = new URLSearchParams();

    if (typeof expanded === "boolean") qs.set("expanded", String(expanded));
    if (typeof raw === "boolean") qs.set("raw", String(raw));
    const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), vechainConfig.mainnet.controllerAbortTimeout);

    try {
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(
          `VeChain node responded ${res.status} ${res.statusText}${bodyText ? `: ${bodyText}` : ""
          }`
        );
      }

      const data = await res.json();

      if (data == null) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Block not found",
                  revision: String(revision),
                  expanded,
                  raw,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err: any) {
      const isAbort = err?.name === "AbortError";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: isAbort ? "Request timed out" : "Failed to fetch VeChain block",
                reason: String(err?.message ?? err),
                url,
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
);

// Fees

server.registerTool(
  "getPriorityFee",
  {
    title: "Suggest a priority fee",
    description: "Fetch a suggested priority fee for including a transaction in the next blocks from VeChain mainnet.",
    // No inputs required by the endpoint today (GET /fees/priority)
    inputSchema: {},
  },
  async () => {
    const base = vechainConfig.mainnet.thorestApiBaseUrl;
    const url = `${base}/fees/priority`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), vechainConfig.mainnet.controllerAbortTimeout);

    try {
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(
          `VeChain node responded ${res.status} ${res.statusText}${bodyText ? `: ${bodyText}` : ""
          }`
        );
      }

      const data = await res.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err: any) {
      const isAbort = err?.name === "AbortError";
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: isAbort ? "Request timed out" : "Failed to fetch priority fee",
                reason: String(err?.message ?? err),
                url,
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
);

server.prompt(
  "Call this function to say hello when the user wants a greeting.",
  () => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: "Hello from Vechain MCP Server!"
          }
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vechain MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});