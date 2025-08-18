import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "../types";
import { registerMathTools } from "./math-tools";
import { registerShoppingTools } from "./shopping-tools";

/**
 * Register all MCP tools based on user permissions
 */
export function registerAllTools(server: McpServer, env: Env, props: Props) {
	// Register math tools (basic functionality for now)
	registerMathTools(server, env, props);
	
	// Register shopping tools
	registerShoppingTools(server, env, props);
	
	// Future tools can be registered here
	// registerOrderTools(server, env, props);
	// registerPaymentTools(server, env, props);
}