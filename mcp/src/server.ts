/**
 * Relay MCP Server — server definition
 *
 * Wraps the Relay REST API as MCP tools so LLM agents can query Helium
 * network data through a structured, type-safe interface.
 *
 * Tools are defined here as stubs; full implementations will follow in
 * subsequent phases (see REL-10).
 */
import { Server }         from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

interface ServerConfig {
  email: string;
  apiUrl?: string;
  apiKey?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool catalogue
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  // L2 — Hotspots
  {
    name: "list_hotspots",
    description:
      "Search and filter Helium L2 hotspots. Supports filtering by owner, " +
      "network (iot | mobile), location, and maker. Returns paginated results.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner:   { type: "string", description: "Owner wallet address (base58)" },
        network: { type: "string", enum: ["iot", "mobile"], description: "Network type" },
        maker:   { type: "string", description: "Maker name or ID" },
        limit:   { type: "number", description: "Max results to return (default 100)" },
        page:    { type: "number", description: "Page number (1-indexed)" },
      },
    },
  },
  {
    name: "get_hotspot",
    description: "Get a single Helium L2 hotspot by its asset ID or ECC key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Hotspot asset ID, ECC key, or internal ID" },
      },
      required: ["id"],
    },
  },
  // L2 — Makers
  {
    name: "list_makers",
    description: "List all known Helium hotspot makers.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_maker",
    description: "Get a single maker by ID or name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Maker ID or name" },
      },
      required: ["id"],
    },
  },
  // L2 — IoT rewards
  {
    name: "get_iot_rewards",
    description:
      "Retrieve IoT reward shares for a hotspot or owner over a date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        hotspot_id: { type: "string", description: "Hotspot asset ID or ECC key" },
        owner:      { type: "string", description: "Owner wallet address" },
        start_date: { type: "string", description: "ISO 8601 start date (YYYY-MM-DD)" },
        end_date:   { type: "string", description: "ISO 8601 end date (YYYY-MM-DD)" },
      },
    },
  },
  {
    name: "get_iot_reward_totals",
    description: "Get aggregated IoT reward totals for a hotspot or owner.",
    inputSchema: {
      type: "object" as const,
      properties: {
        hotspot_id: { type: "string" },
        owner:      { type: "string" },
        start_date: { type: "string" },
        end_date:   { type: "string" },
      },
    },
  },
  // L2 — Mobile rewards
  {
    name: "get_mobile_rewards",
    description: "Retrieve Mobile reward shares for a hotspot or owner over a date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        hotspot_id: { type: "string" },
        owner:      { type: "string" },
        start_date: { type: "string" },
        end_date:   { type: "string" },
      },
    },
  },
  {
    name: "get_mobile_reward_totals",
    description: "Get aggregated Mobile reward totals for a hotspot or owner.",
    inputSchema: {
      type: "object" as const,
      properties: {
        hotspot_id: { type: "string" },
        owner:      { type: "string" },
        start_date: { type: "string" },
        end_date:   { type: "string" },
      },
    },
  },
  // L1 — Accounts
  {
    name: "list_accounts",
    description: "List Helium L1 accounts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number" },
        page:  { type: "number" },
      },
    },
  },
  {
    name: "get_account",
    description: "Get a single Helium L1 account by address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "L1 account address (base58)" },
      },
      required: ["address"],
    },
  },
  // L1 — Gateways
  {
    name: "list_gateways",
    description: "List Helium L1 gateways (hotspots on the legacy chain).",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: { type: "string" },
        limit: { type: "number" },
        page:  { type: "number" },
      },
    },
  },
  {
    name: "get_gateway",
    description: "Get a single L1 gateway by address.",
    inputSchema: {
      type: "object" as const,
      properties: {
        address: { type: "string" },
      },
      required: ["address"],
    },
  },
  // L1 — Transactions
  {
    name: "list_transactions",
    description: "List Helium L1 transactions with optional filters.",
    inputSchema: {
      type: "object" as const,
      properties: {
        account: { type: "string", description: "Filter by account address" },
        type:    { type: "string", description: "Transaction type filter" },
        limit:   { type: "number" },
        page:    { type: "number" },
      },
    },
  },
  {
    name: "get_transaction",
    description: "Get a single L1 transaction by hash.",
    inputSchema: {
      type: "object" as const,
      properties: {
        hash: { type: "string", description: "Transaction hash" },
      },
      required: ["hash"],
    },
  },
  // Meta
  {
    name: "get_api_status",
    description: "Check Relay API health, version, and current usage limits.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Server factory
// ─────────────────────────────────────────────────────────────────────────────

export function createServer(config: ServerConfig): { run: () => Promise<void> } {
  const server = new Server(
    { name: "relay-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // ── list tools ─────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // ── call tool ──────────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    // TODO: implement each tool by calling the Relay REST API.
    // For now, return a stub response so agents can discover capabilities.
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            _stub: true,
            tool:  name,
            note:  "Full implementation coming in REL-10. Connect your Relay API key via RELAY_API_KEY env var.",
            docs:  "https://docs.relay.io",
          }, null, 2),
        },
      ],
    };
  });

  return {
    async run() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      // Server runs until the process exits
    },
  };
}
