import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "./types";
import { registerAllTools } from "./tools/register-tools";

export class ShoppingMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "Shopping MCP Server",
		version: "1.0.0",
	});

	/**
	 * Cleanup resources when Durable Object is shutting down
	 */
	async cleanup(): Promise<void> {
		try {
			console.log('Shopping MCP server cleanup completed');
		} catch (error) {
			console.error('Error during cleanup:', error);
		}
	}

	/**
	 * Durable Objects alarm handler - used for cleanup
	 */
	async alarm(): Promise<void> {
		await this.cleanup();
	}

	async init() {
		// Register all tools based on user permissions
		registerAllTools(this.server, this.env, this.props);
	}
}

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        const url = new URL(request.url);

        // Support both SSE (legacy) and MCP (modern) transports
        if (url.pathname === "/sse" || url.pathname === "/sse/message") {
            return ShoppingMCP.serveSSE("/sse").fetch(request, env, ctx);
        }

        if (url.pathname === "/mcp") {
            return ShoppingMCP.serve("/mcp").fetch(request, env, ctx);
        }

        // Health check endpoint
        if (url.pathname === "/health") {
            return new Response("OK", { status: 200 });
        }

        return new Response("Shopping MCP Server\n\nEndpoints:\n- /mcp (recommended)\n- /sse (legacy)\n- /health", { 
            status: 200,
            headers: { "Content-Type": "text/plain" }
        });
    },
};