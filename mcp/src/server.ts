/**
 * Relay MCP Server — server definition
 *
 * Wraps the Relay REST API as MCP tools so LLM agents can query Helium
 * network data through a structured, type-safe interface.
 */
import { Server }               from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { RelayClient, RelayApiError } from "./client.js";

export interface ServerConfig {
  email: string;
  apiUrl?: string;
  apiKey?: string;
}

// Default Relay API base URL (overridable via RELAY_API_URL env)
const DEFAULT_API_URL = "https://api.relay.io";

// ─────────────────────────────────────────────────────────────────────────────
// Tool catalogue
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  // ── L2 Hotspots ────────────────────────────────────────────────────────────
  {
    name: "list_hotspots",
    description:
      "Search and filter Helium L2 hotspots. Supports filtering by owner wallet, " +
      "network (iot or mobile), maker, and H3 location index. Returns paginated results. " +
      "Use 'networks' as a comma-separated string (e.g. 'iot,mobile').",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner:           { type: "string", description: "Owner wallet address (base58)" },
        asset_id:        { type: "string", description: "Hotspot asset ID (base58)" },
        ecc_key:         { type: "string", description: "Hotspot ECC public key" },
        networks:        { type: "string", description: "Comma-separated networks: 'iot', 'mobile', or 'iot,mobile'" },
        maker_id:        { type: "string", description: "Maker UUID" },
        iot_location:    { type: "number", description: "H3 location index for IoT radio" },
        mobile_location: { type: "number", description: "H3 location index for Mobile radio" },
        page:            { type: "number", description: "Page number (1-indexed, default 1)" },
        per_page:        { type: "number", description: "Results per page (default 100, max 250)" },
      },
    },
  },
  {
    name: "get_hotspot",
    description:
      "Get a single Helium L2 hotspot by its UUID, asset ID, or ECC key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Hotspot UUID, asset ID (base58), or ECC key" },
      },
      required: ["id"],
    },
  },

  // ── L2 Makers ──────────────────────────────────────────────────────────────
  {
    name: "list_makers",
    description: "List all known Helium hotspot manufacturers (makers).",
    inputSchema: {
      type: "object" as const,
      properties: {
        page:     { type: "number", description: "Page number (default 1)" },
        per_page: { type: "number", description: "Results per page (default 100)" },
      },
    },
  },
  {
    name: "get_maker",
    description: "Get a single hotspot maker by UUID or on-chain address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Maker UUID or on-chain address" },
      },
      required: ["id"],
    },
  },

  // ── L2 IoT Rewards ─────────────────────────────────────────────────────────
  {
    name: "get_iot_rewards",
    description:
      "Retrieve IoT reward share records for a given date range. " +
      "Filter by hotspot_key (ECC key) and/or reward_type. " +
      "Both 'from' and 'to' are required (ISO 8601, e.g. '2024-01-01T00:00:00Z').",
    inputSchema: {
      type: "object" as const,
      properties: {
        from:        { type: "string", description: "Start datetime (ISO 8601, required)" },
        to:          { type: "string", description: "End datetime (ISO 8601, required)" },
        hotspot_key: { type: "string", description: "Hotspot ECC key to filter by" },
        reward_type: { type: "string", description: "Reward type filter (e.g. 'beacon', 'witness', 'dc_transfer')" },
        page:        { type: "number", description: "Page number (default 1)" },
        per_page:    { type: "number", description: "Results per page (default 100)" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_iot_reward_totals",
    description:
      "Get aggregated IoT reward totals (beacon, witness, dc_transfer, total) " +
      "for a date range, optionally filtered by hotspot ECC key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from:        { type: "string", description: "Start datetime (ISO 8601, required)" },
        to:          { type: "string", description: "End datetime (ISO 8601, required)" },
        hotspot_key: { type: "string", description: "Hotspot ECC key to filter by" },
        reward_type: { type: "string", description: "Reward type filter" },
      },
      required: ["from", "to"],
    },
  },

  // ── L2 Mobile Rewards ──────────────────────────────────────────────────────
  {
    name: "get_mobile_rewards",
    description:
      "Retrieve Mobile reward share records for a given date range. " +
      "Filter by hotspot_key and/or reward_type. " +
      "Both 'from' and 'to' are required (ISO 8601).",
    inputSchema: {
      type: "object" as const,
      properties: {
        from:        { type: "string", description: "Start datetime (ISO 8601, required)" },
        to:          { type: "string", description: "End datetime (ISO 8601, required)" },
        hotspot_key: { type: "string", description: "Hotspot ECC key to filter by" },
        reward_type: { type: "string", description: "Reward type filter" },
        page:        { type: "number", description: "Page number (default 1)" },
        per_page:    { type: "number", description: "Results per page (default 100)" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_mobile_reward_totals",
    description:
      "Get aggregated Mobile reward totals " +
      "(dc_transfer, poc, subscriber, discovery_location, service_provider, matched, offloaded_bytes) " +
      "for a date range, optionally filtered by hotspot ECC key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        from:        { type: "string", description: "Start datetime (ISO 8601, required)" },
        to:          { type: "string", description: "End datetime (ISO 8601, required)" },
        hotspot_key: { type: "string", description: "Hotspot ECC key to filter by" },
        reward_type: { type: "string", description: "Reward type filter" },
      },
      required: ["from", "to"],
    },
  },

  // ── L1 Accounts ────────────────────────────────────────────────────────────
  {
    name: "list_accounts",
    description: "List Helium L1 (legacy blockchain) accounts. Filter by address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address:  { type: "string", description: "Filter by L1 account address (base58)" },
        page:     { type: "number", description: "Page number (default 1)" },
        per_page: { type: "number", description: "Results per page (default 100)" },
      },
    },
  },
  {
    name: "get_account",
    description: "Get a single Helium L1 account by UUID or base58 address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "L1 account UUID or base58 address" },
      },
      required: ["address"],
    },
  },

  // ── L1 Gateways ────────────────────────────────────────────────────────────
  {
    name: "list_gateways",
    description:
      "List Helium L1 gateways (hotspots on the legacy blockchain). " +
      "Filter by address, owner_address, payer_address, mode, name, or location_hex.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address:       { type: "string", description: "Gateway address (base58)" },
        owner_address: { type: "string", description: "Owner address (base58)" },
        payer_address: { type: "string", description: "Payer address (base58)" },
        mode:          { type: "string", description: "Gateway mode (e.g. 'full', 'light', 'dataonly')" },
        name:          { type: "string", description: "Gateway name (animal name)" },
        location_hex:  { type: "string", description: "H3 hex location string" },
        page:          { type: "number", description: "Page number (default 1)" },
        per_page:      { type: "number", description: "Results per page (default 100)" },
      },
    },
  },
  {
    name: "get_gateway",
    description: "Get a single L1 gateway by UUID or base58 address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "Gateway UUID or base58 address" },
      },
      required: ["address"],
    },
  },

  // ── L1 Transactions ────────────────────────────────────────────────────────
  {
    name: "list_transactions",
    description:
      "List Helium L1 transactions with optional filters. " +
      "Filter by transaction_hash, type, block number, or time range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        transaction_hash: { type: "string", description: "Transaction hash" },
        type:             { type: "string", description: "Transaction type (e.g. 'payment_v2', 'add_gateway_v1')" },
        block:            { type: "number", description: "Block height" },
        from:             { type: "string", description: "Start time (ISO 8601)" },
        to:               { type: "string", description: "End time (ISO 8601)" },
        page:             { type: "number", description: "Page number (default 1)" },
        per_page:         { type: "number", description: "Results per page (default 100)" },
      },
    },
  },
  {
    name: "get_transaction",
    description: "Get a single L1 transaction by UUID or transaction hash.",
    inputSchema: {
      type: "object" as const,
      properties: {
        hash: { type: "string", description: "Transaction UUID or hash" },
      },
      required: ["hash"],
    },
  },

  // ── API Status ─────────────────────────────────────────────────────────────
  {
    name: "get_api_status",
    description: "Check Relay API health. Returns HTTP 200 if the API is up.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper — format tool result
// ─────────────────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function toolErr(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server factory
// ─────────────────────────────────────────────────────────────────────────────

export function createServer(config: ServerConfig): { run: () => Promise<void> } {
  const apiUrl = config.apiUrl ?? process.env["RELAY_API_URL"] ?? DEFAULT_API_URL;
  const apiKey = config.apiKey ?? process.env["RELAY_API_KEY"] ?? "";

  const client = new RelayClient({ apiUrl, apiKey });

  const server = new Server(
    { name: "relay-mcp", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // ── List tools ─────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  // ── Call tool ──────────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (!apiKey) {
      return toolErr(
        "RELAY_API_KEY is not set. Export it before starting the MCP server:\n" +
        "  export RELAY_API_KEY=your_key_here"
      );
    }

    try {
      switch (name) {

        // ── L2 Hotspots ──────────────────────────────────────────────────────
        case "list_hotspots": {
          const data = await client.get("/v1/helium/l2/hotspots", {
            owner:           args["owner"] as string,
            asset_id:        args["asset_id"] as string,
            ecc_key:         args["ecc_key"] as string,
            networks:        args["networks"] as string,
            maker_id:        args["maker_id"] as string,
            iot_location:    args["iot_location"] as number,
            mobile_location: args["mobile_location"] as number,
            page:            args["page"] as number,
            per_page:        args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_hotspot": {
          const data = await client.get(`/v1/helium/l2/hotspots/${encodeURIComponent(args["id"] as string)}`);
          return ok(data);
        }

        // ── L2 Makers ────────────────────────────────────────────────────────
        case "list_makers": {
          const data = await client.get("/v1/helium/l2/makers", {
            page:     args["page"] as number,
            per_page: args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_maker": {
          const data = await client.get(`/v1/helium/l2/makers/${encodeURIComponent(args["id"] as string)}`);
          return ok(data);
        }

        // ── L2 IoT Rewards ───────────────────────────────────────────────────
        case "get_iot_rewards": {
          const data = await client.get("/v1/helium/l2/iot-reward-shares", {
            from:        args["from"] as string,
            to:          args["to"] as string,
            hotspot_key: args["hotspot_key"] as string,
            reward_type: args["reward_type"] as string,
            page:        args["page"] as number,
            per_page:    args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_iot_reward_totals": {
          const data = await client.get("/v1/helium/l2/iot-reward-shares/totals", {
            from:        args["from"] as string,
            to:          args["to"] as string,
            hotspot_key: args["hotspot_key"] as string,
            reward_type: args["reward_type"] as string,
          });
          return ok(data);
        }

        // ── L2 Mobile Rewards ────────────────────────────────────────────────
        case "get_mobile_rewards": {
          const data = await client.get("/v1/helium/l2/mobile-reward-shares", {
            from:        args["from"] as string,
            to:          args["to"] as string,
            hotspot_key: args["hotspot_key"] as string,
            reward_type: args["reward_type"] as string,
            page:        args["page"] as number,
            per_page:    args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_mobile_reward_totals": {
          const data = await client.get("/v1/helium/l2/mobile-reward-shares/totals", {
            from:        args["from"] as string,
            to:          args["to"] as string,
            hotspot_key: args["hotspot_key"] as string,
            reward_type: args["reward_type"] as string,
          });
          return ok(data);
        }

        // ── L1 Accounts ──────────────────────────────────────────────────────
        case "list_accounts": {
          const data = await client.get("/v1/helium/l1/accounts", {
            address:  args["address"] as string,
            page:     args["page"] as number,
            per_page: args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_account": {
          const data = await client.get(`/v1/helium/l1/accounts/${encodeURIComponent(args["address"] as string)}`);
          return ok(data);
        }

        // ── L1 Gateways ──────────────────────────────────────────────────────
        case "list_gateways": {
          const data = await client.get("/v1/helium/l1/gateways", {
            address:       args["address"] as string,
            owner_address: args["owner_address"] as string,
            payer_address: args["payer_address"] as string,
            mode:          args["mode"] as string,
            name:          args["name"] as string,
            location_hex:  args["location_hex"] as string,
            page:          args["page"] as number,
            per_page:      args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_gateway": {
          const data = await client.get(`/v1/helium/l1/gateways/${encodeURIComponent(args["address"] as string)}`);
          return ok(data);
        }

        // ── L1 Transactions ──────────────────────────────────────────────────
        case "list_transactions": {
          const data = await client.get("/v1/helium/l1/transactions", {
            transaction_hash: args["transaction_hash"] as string,
            type:             args["type"] as string,
            block:            args["block"] as number,
            from:             args["from"] as string,
            to:               args["to"] as string,
            page:             args["page"] as number,
            per_page:         args["per_page"] as number,
          });
          return ok(data);
        }

        case "get_transaction": {
          const data = await client.get(`/v1/helium/l1/transactions/${encodeURIComponent(args["hash"] as string)}`);
          return ok(data);
        }

        // ── API Status ───────────────────────────────────────────────────────
        case "get_api_status": {
          const data = await client.get("/up");
          return ok({ status: "ok", response: data });
        }

        default:
          return toolErr(`Unknown tool: ${name}`);
      }
    } catch (e) {
      if (e instanceof RelayApiError) {
        return toolErr(`API error ${e.status}: ${e.body}`);
      }
      return toolErr(e instanceof Error ? e.message : String(e));
    }
  });

  // ── List resources ─────────────────────────────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri:         "relay://hotspot/{id}",
        name:        "Hotspot",
        description: "L2 hotspot data by UUID, asset_id, or ECC key",
        mimeType:    "application/json",
      },
      {
        uri:         "relay://maker/{id}",
        name:        "Maker",
        description: "Hotspot maker data by UUID or on-chain address",
        mimeType:    "application/json",
      },
      {
        uri:         "relay://account/{address}",
        name:        "Account",
        description: "L1 account data by UUID or base58 address",
        mimeType:    "application/json",
      },
    ],
  }));

  // ── Read resource ──────────────────────────────────────────────────────────
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (!apiKey) {
      throw new Error("RELAY_API_KEY is not set.");
    }

    try {
      const hotspotMatch = uri.match(/^relay:\/\/hotspot\/(.+)$/);
      if (hotspotMatch) {
        const id   = decodeURIComponent(hotspotMatch[1]!);
        const data = await client.get(`/v1/helium/l2/hotspots/${encodeURIComponent(id)}`);
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
      }

      const makerMatch = uri.match(/^relay:\/\/maker\/(.+)$/);
      if (makerMatch) {
        const id   = decodeURIComponent(makerMatch[1]!);
        const data = await client.get(`/v1/helium/l2/makers/${encodeURIComponent(id)}`);
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
      }

      const accountMatch = uri.match(/^relay:\/\/account\/(.+)$/);
      if (accountMatch) {
        const address = decodeURIComponent(accountMatch[1]!);
        const data    = await client.get(`/v1/helium/l1/accounts/${encodeURIComponent(address)}`);
        return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    } catch (e) {
      if (e instanceof RelayApiError) {
        throw new Error(`API error ${e.status}: ${e.body}`);
      }
      throw e;
    }
  });

  return {
    async run() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
