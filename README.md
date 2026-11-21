# 1Money Network MCP
<img src="./public/logo.png" alt="1Money Logo" width="200"/> 

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
- `ONEMONEY_PROTOCOL_HEADERS`: optional JSON string of headers to include in all requests (only needed for custom gateways/proxies)

Example `.env` file (see `.env.example`):

```bash
export ONEMONEY_PROTOCOL_NETWORK=testnet
export ONEMONEY_PROTOCOL_TIMEOUT_MS=15000
```
Most users can omit `ONEMONEY_PROTOCOL_HEADERS`.

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
        "ONEMONEY_PROTOCOL_NETWORK": "testnet"
      }
    }
  }
}
```

### Claude Code

Run the following command in your terminal:

```bash
claude mcp add --transport stdio 1money-network --env ONEMONEY_PROTOCOL_NETWORK=testnet -- npx -y @1money/network-mcp
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
        "ONEMONEY_PROTOCOL_NETWORK": "testnet"
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
env = { ONEMONEY_PROTOCOL_NETWORK = "testnet" }
```

## Example Tool Calls

MCP tool names use underscores (`accounts_get_nonce`). The `schemas/tools.json` keys use dots.

```json
{
  "tool": "accounts_get_nonce",
  "input": {
    "address": "0x9E1E9688A44D058fF181Ed64ddFAFbBE5CC74ff3"
  }
}
```

```json
{
  "tool": "transactions_estimate_fee",
  "input": {
    "from": "0x9E1E9688A44D058fF181Ed64ddFAFbBE5CC74ff3",
    "to": "0x1111111111111111111111111111111111111111",
    "value": "1000000000",
    "token": "0x2cd8999Be299373D7881f4aDD11510030ad1412F"
  }
}
```

## Sending Transactions

Every write goes to the node's `/v2` write API, which signs a domain-separated digest. The server never
holds a key. A write takes three calls:

```text
prepare tool ──> signing_hash ──> sign (your wallet, or utils_sign_digest) ──> transactions_submit
```

1. Call a prepare tool (for example `transactions_prepare_payment`) with the unsigned payload. Read
   `chain_id` from `chain_get_chain_id` and the signer's next `nonce` from `accounts_get_nonce`. The
   tool validates the payload, sends nothing, and returns `operation`, `unsigned`, `memo` and
   `signing_hash`.
2. Sign `signing_hash` with the signer's secp256k1 key.
3. Call `transactions_submit` with `operation`, `unsigned` and `memo` unchanged, and the signature. It
   sends the transaction once and returns its `transaction_hash`.

When a submit fails, the result is an error with `submitted` and `next_step`:

| `submitted` | Meaning | What to do |
|---|---|---|
| `false` | Nothing was sent, or the node refused it with no effect. | Follow `next_step`: fix the input, or send the same signed transaction later or to another node. |
| `true` | The node holds the transaction. | Do not sign this intent again. Read it with `transactions_get_status_by_hash` and `transactions_get_receipt_by_hash`. |
| `"unknown"` | The transaction may execute. | Do not sign this intent again. Read its status and receipt by hash first. |

`utils_sign_digest` takes a private key in the tool input, so the key passes through the conversation
and the MCP client. Use it only with test keys.

The legacy `/v1` write tools (`tokens.mint`, `transactions.payment`, `utils.sign_message`, ...) are
removed: l1client v0.8.13 and later answer every `/v1` write with HTTP 410.

## Example Prompts

- "Get the current chain id."
- "Fetch the latest checkpoint number on testnet."
- "Estimate the fee for sending 1000000000 units from 0x... to 0x... with token 0x...."
- "Get token metadata for 0x...."
- "Derive the token account address for wallet 0x... and mint 0x...."
- "Prepare a payment of 1000 units of token 0x... from 0x... to 0x...."

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
- `tokens.prepare_issue`
- `tokens.prepare_burn`
- `tokens.prepare_bridge_and_mint`
- `tokens.prepare_burn_and_bridge`

### transactions

- `transactions.get_by_hash`
- `transactions.get_status_by_hash`
- `transactions.get_receipt_by_hash`
- `transactions.get_finalized_by_hash`
- `transactions.estimate_fee`
- `transactions.prepare_payment`
- `transactions.submit`

### utils

- `utils.derive_token_address`
- `utils.sign_digest`
- `utils.encode_payload`
- `utils.to_hex`
- `utils.typeof`
- `utils.safe_promise_all`
- `utils.safe_promise_line`

Batch tools (`utils.safe_promise_all` and `utils.safe_promise_line`) accept a `calls` array of `{ tool, input }` objects. The `safe_promise_all` variant executes in parallel and fails on the first error. The `safe_promise_line` variant executes sequentially and ignores errors. Because a batch drops or hides the errors of its calls, it refuses `transactions.submit` before it runs any call: send each transaction on its own, so its `submitted` state, hash and next step reach you.

## Schema

`schemas/tools.json` is the JSON Schema source for all tools. After you change it, run
`pnpm generate-schemas` to regenerate `src/schemas/zod.ts`.

## Development

```bash
pnpm install
pnpm check   # typecheck, unit tests against a mock node, build
```
