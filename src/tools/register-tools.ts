import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "../types";
import { registerShoppingTools } from "./shopping-tools";

/**
 * Register all MCP tools based on user permissions
 */
export function registerAllTools(server: McpServer, env: Env, props: Props) {
  // Register shopping tools
  registerShoppingTools(server, env, props);

  // Future tools can be registered here
  // registerOrderTools(server, env, props);
  // registerPaymentTools(server, env, props);
}
