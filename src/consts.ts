const THOREST_API_BASE_URL = "https://sync-mainnet.vechain.org"
const CONTROLLER_ABORT_TIMEOUT_MS = 15_000 // 15 seconds
const ADDRESS_REGEX = /^(0x)?[0-9a-fA-F]{40}$/;
const TXID_REGEX = /^0x[0-9a-fA-F]{64}$/;

export const vechainConfig = {
    general: {
        addressRegex: ADDRESS_REGEX,
        txidRegex: TXID_REGEX,
    },
    mainnet: {
        thorestApiBaseUrl: THOREST_API_BASE_URL,
        controllerAbortTimeout: CONTROLLER_ABORT_TIMEOUT_MS,
    },
}
