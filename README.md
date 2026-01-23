# 1Money Network MCP

MCP (stdio) server for the 1Money Network Protocol, backed by `@1money/protocol-ts-sdk`.

## What This MCP Server Does

- Exposes protocol API endpoints (accounts, tokens, transactions, checkpoints, chain) as MCP tools.
- Includes utility tools for signing, hashing, RLP encoding, and address derivation.
- Uses the SDK client configuration and respects network/base URL/timeouts.

## Configuration

Environment variables:

- `ONEMONEY_PROTOCOL_NETWORK`: `testnet`, `mainnet`, or `local` (default: `testnet`)
- `ONEMONEY_PROTOCOL_BASE_URL`: override the network base URL
- `ONEMONEY_PROTOCOL_TIMEOUT_MS`: request timeout in ms (default: `10000`)
- `ONEMONEY_PROTOCOL_HEADERS`: JSON string of headers to include in all requests

Example:

```bash
export ONEMONEY_PROTOCOL_NETWORK=testnet
export ONEMONEY_PROTOCOL_TIMEOUT_MS=15000
export ONEMONEY_PROTOCOL_HEADERS='{"Authorization":"Bearer YOUR_TOKEN"}'
```

## Integration

### Cursor (one-click install)

After installation, add your configuration to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "1money-network": {
      "command": "npx",
      "args": ["-y", "@1money/network-mcp"],
      "env": {
        "ONEMONEY_PROTOCOL_NETWORK": "testnet",
        "ONEMONEY_PROTOCOL_HEADERS": "{\"Authorization\":\"Bearer YOUR_TOKEN\"}"
      }
    }
  }
}
```

### Claude Code

Run the following command in your terminal:

```bash
claude mcp add --transport stdio 1money-network --env ONEMONEY_PROTOCOL_NETWORK=testnet --env ONEMONEY_PROTOCOL_HEADERS='{"Authorization":"Bearer YOUR_TOKEN"}' -- npx -y @1money/network-mcp
```

### Claude Desktop

Add to your Claude Desktop configuration file:

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`  
Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "1money-network": {
      "command": "npx",
      "args": ["-y", "@1money/network-mcp"],
      "env": {
        "ONEMONEY_PROTOCOL_NETWORK": "testnet",
        "ONEMONEY_PROTOCOL_HEADERS": "{\"Authorization\":\"Bearer YOUR_TOKEN\"}"
      }
    }
  }
}
```

### Codex Integration

Add the MCP server to your Codex config file, then restart Codex:

```toml
[mcp_servers.1money-network]
command = "npx"
args = ["-y", "@1money/network-mcp"]
env = { ONEMONEY_PROTOCOL_NETWORK = "testnet", ONEMONEY_PROTOCOL_HEADERS = "{\"Authorization\":\"Bearer YOUR_TOKEN\"}" }
```

## Example Tool Calls

```json
{
  "tool": "accounts.get_nonce",
  "input": {
    "address": "0x9E1E9688A44D058fF181Ed64ddFAFbBE5CC74ff3"
  }
}
```

```json
{
  "tool": "transactions.estimate_fee",
  "input": {
    "from": "0x9E1E9688A44D058fF181Ed64ddFAFbBE5CC74ff3",
    "value": "1000000000",
    "token": "0x2cd8999Be299373D7881f4aDD11510030ad1412F"
  }
}
```

```json
{
  "tool": "utils.sign_message",
  "input": {
    "payload": [
      1212101,
      2,
      "0x0000000000000000000000000000000000000000",
      "1000000000000000000",
      "0x0000000000000000000000000000000000000000"
    ],
    "private_key": "0xYOUR_PRIVATE_KEY"
  }
}
```

Note: `utils.sign_message` accepts a private key directly. Avoid using real keys in shared environments.

## Example Prompts

- "Get the current chain id."
- "Fetch the latest checkpoint number on testnet."
- "Estimate fee for sending 1000000000 units from 0x... with token 0x...."
- "Get token metadata for 0x...."
- "Derive the token account address for wallet 0x... and mint 0x...."

## Tools

### accounts

- `accounts.get_nonce`
- `accounts.get_bbnonce`
- `accounts.get_token_account`

### chain

- `chain.get_chain_id`

### checkpoints

- `checkpoints.get_number`
- `checkpoints.get_by_hash`
- `checkpoints.get_by_number`
- `checkpoints.get_receipts_by_number`

### tokens

- `tokens.get_token_metadata`
- `tokens.manage_blacklist`
- `tokens.manage_whitelist`
- `tokens.burn`
- `tokens.grant_authority`
- `tokens.issue`
- `tokens.mint`
- `tokens.pause`
- `tokens.update_metadata`
- `tokens.bridge_and_mint`
- `tokens.burn_and_bridge`

### transactions

- `transactions.get_by_hash`
- `transactions.get_receipt_by_hash`
- `transactions.get_finalized_by_hash`
- `transactions.estimate_fee`
- `transactions.payment`

### utils

- `utils.derive_token_address`
- `utils.sign_message`
- `utils.encode_payload`
- `utils.to_hex`
- `utils.calc_tx_hash`
- `utils.typeof`
- `utils.safe_promise_all`
- `utils.safe_promise_line`

Batch tools (`utils.safe_promise_all` and `utils.safe_promise_line`) accept a `calls` array of `{ tool, input }` objects. The `safe_promise_all` variant executes in parallel and fails on the first error. The `safe_promise_line` variant executes sequentially and ignores errors.
## Schema

`schemas/tools.json` is the JSON Schema source for all tools.




API-M7AWURYVTNNG2ZGZ08QP



SEC-gm1VoRN3yVKyAboozbWKS7cR7Tk_sueZ6oIRfGhppbY