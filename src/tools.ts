import { getOnChainTools } from "@goat-sdk/adapter-model-context-protocol";
import { viem } from "@goat-sdk/wallet-viem";
import { isMainnet, walletClient } from "./wallet.js";
import z from "zod";
import { createVechainDocsMcpClient } from "./client.js";
import { vechainConfig } from "./config.js";
import { REVISION, type VeChainTool } from "./types.js";
import { Address, Certificate, Hex, Mnemonic, Secp256k1, Transaction } from "@vechain/sdk-core";

export const toolsPromise = async (): Promise<ReturnType<typeof getOnChainTools>> => {
    try {
        const { listOfTools, toolHandler } = await getOnChainTools({
            wallet: viem(walletClient),
            plugins: [],
        });

        return {
            listOfTools,
            toolHandler,
        }
    } catch (error) {
        console.error("Error initializing on-chain tools:", error);
        throw error;
    }
}

export const vechainTools: VeChainTool[] = [
        // Vechain DOCS

        {
            name: "search_documentation",
            title: "Search VeChain Documentation",
            description: "Search across the documentation to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about VeChain Docs, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages.",
            inputSchema: {
                query: z.string().describe("The search query string"),
            },
            callback: async ({ query }: { query: string }) => {
                try {
                    const vechainDocsMcpClient = await createVechainDocsMcpClient();

                    const response = await vechainDocsMcpClient.client.callTool({ name: "searchDocumentation", arguments: { query } })

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(response, null, 2),
                            },
                        ],
                    };

                } catch (err) {
                    const isAbort = (err as Error)?.name === "AbortError";

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(
                                    {
                                        error: isAbort ? "Request timed out" : "Failed to fetch account",
                                        reason: String((err as Error)?.message ?? err),
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }
            }
        },

        // Thorest API

        // Accounts

        {
            name: "get_account",
            title: "Retrieve account details",
            description: "Get information about a VeChain account/contract by address. Optionally specify a revision (best | justified | finalized | block number | block ID).",
            inputSchema: {
                address: z
                    .string()
                    .regex(vechainConfig.general.addressRegex, "Invalid address: expected 20-byte hex, optional 0x prefix")
                    .describe("Account/contract address (20-byte hex, with or without 0x prefix)"),
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
                        )
                        .default("best"),
            },
            callback: async ({ address, revision }: { address: string, revision: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodEnum<[REVISION.Best, REVISION.Justified, REVISION.Finalized]>, z.ZodNumber, z.ZodString]>>> }) => {
                const normalizedAddress = address.startsWith("0x")
                    ? address.toLowerCase()
                    : `0x${address.toLowerCase()}`;

                const base = isMainnet ? vechainConfig.mainnet.thorestApiBaseUrl : vechainConfig.testnet.thorestApiBaseUrl;
                const path = `/accounts/${encodeURIComponent(normalizedAddress)}`;
                const qs = new URLSearchParams();

                if (revision !== undefined && revision !== null) {
                    qs.set("revision", String(revision));
                }

                const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), isMainnet ? vechainConfig.mainnet.controllerAbortTimeout : vechainConfig.testnet.controllerAbortTimeout);

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
                } catch (err) {
                    const isAbort = (err as Error)?.name === "AbortError";
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(
                                    {
                                        error: isAbort ? "Request timed out" : "Failed to fetch account",
                                        reason: String((err as Error)?.message ?? err),
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
        },

        // Transactions

        {
            name: "get_transaction",
            title: "Retrieve a transaction by ID",
            description: "Get a VeChain transaction by its ID. Optionally include pending txs (meta may be null), return raw hex, or pin to a specific head block.",
            inputSchema: {
                id: z
                    .string()
                    .regex(vechainConfig.general.txidRegex, "Invalid transaction ID: expected 0x + 64 hex chars")
                    .describe("Transaction ID (0x-prefixed 32-byte hex)"),
                pending: z
                    .boolean()
                    .optional()
                    .describe("Include pending transactions (meta may be null). Default: false"),
                raw: z
                    .boolean()
                    .optional()
                    .describe("Include raw hex transaction in response. Default: false"),
                head: z
                    .string()
                    .optional()
                    .describe("Head block ID to use; defaults to best if omitted"),
            },
            callback: async ({ id, pending = false, raw = false, head }: { id: string, pending?: boolean, raw?: boolean, head?: string }) => {
                const base = isMainnet ? vechainConfig.mainnet.thorestApiBaseUrl : vechainConfig.testnet.thorestApiBaseUrl;
                const path = `/transactions/${encodeURIComponent(id)}`;
                const qs = new URLSearchParams();

                if (typeof pending === "boolean") qs.set("pending", String(pending));
                if (typeof raw === "boolean") qs.set("raw", String(raw));
                if (head) qs.set("head", head);

                const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), isMainnet ? vechainConfig.mainnet.controllerAbortTimeout : vechainConfig.testnet.controllerAbortTimeout);

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
                } catch (err) {
                    const isAbort = (err as Error)?.name === "AbortError";
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(
                                    {
                                        error: isAbort ? "Request timed out" : "Failed to fetch transaction",
                                        reason: String((err as Error)?.message ?? err),
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
        },

        // Blocks

        {
            name: "get_block",
            title: "Get a VeChain block",
            description: "Retrieve information about a VeChain block by its revision (block ID, number, or keywords: best | justified | finalized).",
            inputSchema: {
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
                    )
                    .default("best"),
                expanded: z
                    .boolean()
                    .optional()
                    .describe(
                        "Return transactions expanded (objects) instead of just IDs (default: false)"
                    ),
                raw: z
                    .boolean()
                    .optional()
                    .describe("Return RLP-encoded block instead of structured JSON (default: false)"),
            },
            callback: async ({ revision, expanded = false, raw = false }: { revision: z.ZodDefault<z.ZodUnion<[z.ZodEnum<[REVISION.Best, REVISION.Justified, REVISION.Finalized]>, z.ZodNumber, z.ZodString]>>, expanded?: boolean, raw?: boolean }) => {
                const base = isMainnet ? vechainConfig.mainnet.thorestApiBaseUrl : vechainConfig.testnet.thorestApiBaseUrl;
                const path = `/blocks/${encodeURIComponent(String(revision))}`;
                const qs = new URLSearchParams();

                if (typeof expanded === "boolean") qs.set("expanded", String(expanded));
                if (typeof raw === "boolean") qs.set("raw", String(raw));
                const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), isMainnet ? vechainConfig.mainnet.controllerAbortTimeout : vechainConfig.testnet.controllerAbortTimeout);

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
                } catch (err) {
                    const isAbort = (err as Error)?.name === "AbortError";
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(
                                    {
                                        error: isAbort ? "Request timed out" : "Failed to fetch VeChain block",
                                        reason: String((err as Error)?.message ?? err),
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
        },

        // Fees

        {
            name: "get_priority_fee",
            title: "Suggest a priority fee",
            description: "Fetch a suggested priority fee for including a transaction in the next blocks from VeChain mainnet.",
            inputSchema: {},
            callback: async () => {
                const base = isMainnet ? vechainConfig.mainnet.thorestApiBaseUrl : vechainConfig.testnet.thorestApiBaseUrl;
                const url = `${base}/fees/priority`;

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), isMainnet ? vechainConfig.mainnet.controllerAbortTimeout : vechainConfig.testnet.controllerAbortTimeout);

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
                } catch (err) {
                    const isAbort = (err as Error)?.name === "AbortError";
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(
                                    {
                                        error: isAbort ? "Request timed out" : "Failed to fetch priority fee",
                                        reason: String((err as Error)?.message ?? err),
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
        },

        // Wallet and signature management

        {
            name: "create_wallet",
            title: "Create a VeChain wallet (mnemonic + keys)",
            description: "Generate a BIP-39 mnemonic (12/15/18/21/24 words) and derive the account-level secp256k1 key at path m/44'/818'/0'/0 (VET coin type = 818). By default, the private key is REDACTED in the response. Set includeSecret=true to include it (handle with care).",
            inputSchema: {
                wordlistSize: z
                    .union([z.literal(12), z.literal(15), z.literal(18), z.literal(21), z.literal(24)])
                    .optional()
                    .describe("Length of the BIP-39 mnemonic wordlist. Default: 12")
            },
            callback: async ({ wordlistSize = 12 }: { wordlistSize?: 12 | 15 | 18 | 21 | 24 }) => {
                try {
                    const mnemonic = Mnemonic.of(wordlistSize);
                    const secretKey = Mnemonic.toPrivateKey(mnemonic);
                    const secretKeyHex = Hex.of(secretKey).toString();

                    const publicKey = Secp256k1.derivePublicKey(secretKey);
                    const publicKeyAddress = Address.ofPublicKey(publicKey).toString();

                    const result = {
                        mnemonic,
                        secretKey,
                        secretKeyHex,
                        publicKey: publicKeyAddress
                    };

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    };
                } catch (err) {
                    const isAbort = (err as Error)?.name === "AbortError";
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(
                                    {
                                        error: isAbort ? "Request timed out" : "Failed to create wallet",
                                        reason: String((err as Error)?.message ?? err),
                                    },
                                    null,
                                    2
                                ),
                            },
                        ],
                    };
                }
            }
        },

        {
            name: "sign_certificate",
            title: "Sign certificate",
            description: "Create and sign a canonical certificate. Includes purpose, payload, domain, timestamp, nonce, and expiresAt.",
            inputSchema: {
                purpose: z.enum(["identification", "attestation", "verification"]).default("identification"),
                payload: z.any().describe("Content to be attested (string or JSON)"),
                domain: z.string().min(1).describe("Scope or domain where it is valid"),
                timestamp: z.number().int().positive().optional(),
            },
            callback: async ({
                purpose,
                payload,
                domain,
                timestamp = Math.floor(Date.now() / 1000),
            }: {
                purpose: "identification" | "attestation" | "verification",
                payload: any,
                domain: string,
                timestamp?: number
            }) => {
                const secretKey = process.env.AGENT_SECRET_KEY

                if (!secretKey) {
                    throw new Error("Missing AGENT_SECRET_KEY variable to use this tool.")
                }

                const secretKeyBytes = Address.of(secretKey).bytes
                const publicKey = Secp256k1.derivePublicKey(secretKeyBytes);
                const publicKeyAddress = Address.ofPublicKey(publicKey).toString();

                const certificate = Certificate.of({
                    purpose,
                    payload,
                    timestamp,
                    domain,
                    signer: publicKeyAddress
                })

                const signature = certificate.sign(secretKeyBytes);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(signature, null, 2)
                    }]
                };
            }
        },

        {
            name: "sign_raw_transaction",
            title: "Sign raw transaction",
            description: "Decode and sign a raw transaction.",
            inputSchema: {
                rawTransaction: z.string(),
            },
            callback: async ({ rawTransaction }: { rawTransaction: string }) => {
                const secretKey = process.env.AGENT_SECRET_KEY

                if (!secretKey) {
                    throw new Error("Missing AGENT_SECRET_KEY variable to use this tool.")
                }

                const secretKeyBytes = Address.of(secretKey).bytes

                const decodedTxBytes = Hex.of(rawTransaction).bytes
                const decodedTx = Transaction.decode(decodedTxBytes, true);

                const signedTx = decodedTx.sign(secretKeyBytes)
                const signedTxBytes = signedTx.encoded
                const signedTxHex = Hex.of(signedTxBytes).toString()

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(signedTxHex, null, 2)
                    }]
                };

            }
        }
    ]