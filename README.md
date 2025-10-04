<div align="center">

<img src="./docs/images/isotipo-bg.png" alt="VeChain logo" width="140">

<p></p>

<h1>VeChain MCP Server</h1>

<p>VeChain MCP Server is an MCP server specifically designed for the VeChain network. It provides advanced functionalities such as querying the official VeChain documentation, executing HTTP requests to the Thor REST API in both Mainnet and Testnet environments, and managing cryptographic signatures through an integrated wallet.</p>

</div>

---

## Tools

- ### Vechain Docs 

    - **Docs**
        
        - `search_documentation`: Search VeChain Documentation.

- ### Thorest API

    - **Accounts**
        
        - `get_account`: Retrieve account details.

    - **Transactions**
        
        - `get_transaction`: Retrieve a transaction by ID.
        
    - **Blocks**
        
        - `get_block`: Get a VeChain block.
    
    - **Fees**
        
        - `get_priority_fee`: Suggest a priority fee.

- ### Wallet & signatures

    - **Wallet**
       
        - `create_wallet`: Create a VeChain wallet (mnemonic + keys).
    
    - **Signatures**
       
        - `sign_certificate`: Create and sign a canonical certificate.
       
        - `sign_raw_transaction`: Sign raw transaction.

- ### Goat SDK (VeChain Tools)

    - `get_address`: Get the address of the wallet
    
    - `get_chain`: Get the chain of the wallet
    
    - `sign_message`: Sign a message with the wallet
    
    - `get_balance`: Get the balance of the wallet for native currency or a specific ERC20 token.
    
    - `get_token_info_by_ticker`: Get information about a configured token (like contract address and decimals) by its ticker symbol.
    
    - `convert_to_base_units`: Convert a token amount from human-readable units to its smallest unit (e.g., wei).
    
    - `convert_from_base_units`: Convert a token amount from its smallest unit (e.g., wei) to human-readable units.
    
    - `sign_typed_data_evm`: Sign an EIP-712 typed data structure (EVM)
    
    - `get_token_allowance_evm`: Get the allowance of an ERC20 token for a spender (returns amount in base units)
    
    - `send_token`: Send native currency or an ERC20 token to a recipient, in base units.
    
    - `approve_token_evm`: Approve an amount (specified in base units) of an ERC20 token for a spender

    - `revoke_token_approval_evm`: Revoke approval for an ERC20 token from a spender (sets allowance to 0)


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

Run the command: `pnpm run build` and then: `pnpm run start`

## Deployment

To deploy this MCP server, fork this project into your GitHub account, log in to [smithery.ai](https://smithery.ai/), and click Publish server. Complete the steps, and once it is deployed, add the required environment variables in settings.

---

## License

MIT