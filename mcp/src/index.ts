#!/usr/bin/env node
/**
 * Relay MCP Server — entry point
 *
 * Displays the welcome/auth screen then starts the MCP server over stdio.
 * Run:  npx ts-node src/index.ts
 */
import { promptEmail } from "./welcome";
import { createServer } from "./server";

async function main(): Promise<void> {
  // Show welcome screen and collect email (stub auth)
  const email = await promptEmail();

  // Start MCP server over stdio (LLM agents connect via this transport)
  const server = createServer({ email });
  await server.run();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
