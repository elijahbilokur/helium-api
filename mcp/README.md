# @relay/mcp-server

Model Context Protocol (MCP) server for the [Relay API](https://relay.io) — gives LLM agents structured, type-safe access to Helium network data.

Supports Claude, GPT, and any MCP-compatible host.

## Requirements

- Node.js 18+
- A Relay API key ([sign up at relay.io](https://relay.io))

## Quick start

```bash
# Install
npm install -g @relay/mcp-server

# Set your API key
export RELAY_API_KEY=your_relay_api_key

# Run
relay-mcp
```

The welcome screen appears on first launch. The server then listens on stdio for MCP client connections.

## Development / preview

```bash
cd mcp
npm install
npm run preview   # welcome screen only (no API calls)
npm run dev       # full server
```

## Configuration

| Environment variable | Default                 | Description                        |
|----------------------|-------------------------|------------------------------------|
| `RELAY_API_KEY`      | *(required)*            | Your Relay API key                 |
| `RELAY_API_URL`      | `https://api.relay.io`  | Override the API base URL          |

## Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "relay": {
      "command": "relay-mcp",
      "env": {
        "RELAY_API_KEY": "your_relay_api_key"
      }
    }
  }
}
```

## Available tools

### L2 — Hotspots (Solana era)

| Tool | Description |
|------|-------------|
| `list_hotspots` | Search/filter hotspots by owner, network, maker, or location |
| `get_hotspot` | Get a single hotspot by UUID, asset ID, or ECC key |

### L2 — Makers

| Tool | Description |
|------|-------------|
| `list_makers` | List all known hotspot manufacturers |
| `get_maker` | Get a maker by UUID or on-chain address |

### L2 — IoT Rewards

| Tool | Description |
|------|-------------|
| `get_iot_rewards` | IoT reward shares for a date range (requires `from` + `to`) |
| `get_iot_reward_totals` | Aggregated IoT totals (beacon, witness, dc_transfer) |

### L2 — Mobile Rewards

| Tool | Description |
|------|-------------|
| `get_mobile_rewards` | Mobile reward shares for a date range (requires `from` + `to`) |
| `get_mobile_reward_totals` | Aggregated Mobile totals (poc, subscriber, discovery_location, …) |

### L1 — Legacy blockchain

| Tool | Description |
|------|-------------|
| `list_accounts` | List L1 accounts |
| `get_account` | Get an L1 account by UUID or base58 address |
| `list_gateways` | List L1 gateways with filters |
| `get_gateway` | Get an L1 gateway by UUID or base58 address |
| `list_transactions` | List L1 transactions with filters |
| `get_transaction` | Get an L1 transaction by UUID or hash |

### Meta

| Tool | Description |
|------|-------------|
| `get_api_status` | Health check — returns 200 if the API is up |

## Resources

The server exposes three MCP resource types:

```
relay://hotspot/{id}      — L2 hotspot by UUID, asset_id, or ECC key
relay://maker/{id}        — Maker by UUID or on-chain address
relay://account/{address} — L1 account by UUID or base58 address
```

## Example agent prompt

> "Using the Relay MCP server, find all IoT hotspots owned by wallet `abc123…` and show me their total beacon rewards for January 2024."

The agent will call `list_hotspots` with `owner=abc123…` and `networks=iot`, then `get_iot_reward_totals` with `from=2024-01-01T00:00:00Z` and `to=2024-02-01T00:00:00Z`.

## Build

```bash
cd mcp
npm run build    # compiles TypeScript → dist/
npm start        # runs compiled output
```

## Publishing

```bash
npm publish --access public
```

Package name: `@relay/mcp-server`
