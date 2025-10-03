import { http, createWalletClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { vechain } from "viem/chains";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { vechainConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const currentEnvironment = process.env.ENVIRONMENT || "";
export const isMainnet = currentEnvironment === "MAINNET";
export const agentSecretKey = process.env.AGENT_SECRET_KEY || "";
export const rpcUrl = isMainnet ? vechainConfig.mainnet.rpc : vechainConfig.testnet.rpc;

export const account = privateKeyToAccount(agentSecretKey as `0x${string}`);

export const walletClient: WalletClient = createWalletClient({
    account,
    transport: http(rpcUrl),
    chain: vechain,
});

