<div align="center">

<img src="./src/public/images/isotipo.png" alt="VeChain logo" width="140">

<p></p>

<h1>VeChain MCP Server</h1>

<p>VeChain MCP Server is an MCP server specifically designed for the VeChain network. It provides advanced functionalities such as querying the official VeChain documentation, executing HTTP requests to the Thor REST API in both Mainnet and Testnet environments, and managing cryptographic signatures through an integrated wallet.</p>

</div>

---

## Tools

- ### Vechain Docs 

    - Docs
        - `searchDocumentation`: Search VeChain Documentation.

- ### Thorest API

    - **Accounts**
        - `getAccount`: Retrieve account details.

    - **Transactions**
        - `getTransaction`: Retrieve a transaction by ID.
        
    - **Blocks**
        - `getBlock`: Get a VeChain block.
    - **Fees**
        - `getPriorityFee`: Suggest a priority fee.

- ### Wallet & signatures

    - **Wallet**
        - `createWallet`: Create a VeChain wallet (mnemonic + keys).
    - **Signatures**
        - `signCertificate`: Create and sign a canonical certificate.
        - `signMessage`: Sign a message.
        - `signTransaction`: Decode and sign a raw transaction.

---

## .env Config

- `AGENT_SECRET_KEY`: CSecret key in string format that allows your MCP server to use the signatures tools.

- `ENVIRONMENT`: Working environment, either mainnet or test.

- `USE_STREAMABLE_HTTP`: Specifies whether your MCP server will run on stdio or streamable-http.

- `PORT`: Port where your MCP server will run when using streamable-http.

- `HOST`: Host where your MCP server will run when using streamable-http.

## Run the project locally

In one terminal window, run the following command: `pnpx @modelcontextprotocol/inspector pnpx tsx ./src/index.ts` in `stdio` mode.

## Build and run

Run the command: `pnpm run build` and then: `node ./dist/index.js`

## Deployment

To deploy this MCP server, fork this project into your GitHub account, log in to [smithery.ai](https://smithery.ai/), and click Publish server. Complete the steps, and once it is deployed, add the required environment variables in settings.

---

## License

MIT