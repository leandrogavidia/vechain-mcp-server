const MAINNET_THOREST_API_BASE_URL = "https://sync-mainnet.vechain.org"
const TESTNET_THOREST_API_BASE_URL = "https://testnet.vechain.org"
const CONTROLLER_ABORT_TIMEOUT_MS = 15_000 // 15 seconds

const ADDRESS_REGEX = /^(0x)?[0-9a-fA-F]{40}$/;
const TXID_REGEX = /^0x[0-9a-fA-F]{64}$/;

const MCP_CLIENT_NAME = "vechain-docs-client"
const MCP_CLIENT_VERSION = "1.0.0"

const VECHAIN_DOCS_URL = "https://docs.vechain.org"

const MCP_SERVER_NAME = "vechain-mpc-server"
const MCP_SERVER_VERSION = "1.0.0"

const MAINNET_RPC_URL = "https://mainnet.rpc.vechain.org"
const TESTNET_RPC_URL = "http://testnet.rpc.vechain.org"

export const vechainConfig = {
    general: {
        addressRegex: ADDRESS_REGEX,
        txidRegex: TXID_REGEX,
    },
    mainnet: {
        thorestApiBaseUrl: MAINNET_THOREST_API_BASE_URL,
        controllerAbortTimeout: CONTROLLER_ABORT_TIMEOUT_MS,
        rpc: MAINNET_RPC_URL
    },
    testnet: {
        thorestApiBaseUrl: TESTNET_THOREST_API_BASE_URL,
        controllerAbortTimeout: CONTROLLER_ABORT_TIMEOUT_MS,
        rpc: TESTNET_RPC_URL
    },
    mcpClient: {
        name: MCP_CLIENT_NAME,    
        version: MCP_CLIENT_VERSION,
        vechainDocsUrl: VECHAIN_DOCS_URL
    },
    mcpServer: {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION
    }
}
