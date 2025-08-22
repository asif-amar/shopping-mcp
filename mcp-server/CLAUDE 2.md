# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is designed to be an MCP (Model Context Protocol) shopping server that will provide shopping-related tools and resources to AI applications. The project is currently in its initial documentation phase.

## Important Note:

Always read and or search in the MCP-EXPLANATION.md and MCP-README.md files for more information about the MCP protocol and its features before starting to code.

## Example of a Real MCP Server:

An example of a real MCP server can be found in the remote-mcp-server-with-auth-main directory.
You can use it as a reference for how to implement the MCP server.

**Key Components from the Example:**
- **McpAgent**: Extends `McpAgent<Env, Record<string, never>, Props>` for Cloudflare Workers
- **Durable Objects**: Provides stateful behavior and user session management  
- **GitHub OAuth**: Complete authentication flow with signed cookies
- **Modular Tool Registration**: Tools are organized in separate files and registered via `registerAllTools()`
- **Dual Transport Support**: Both `/mcp` (Streamable HTTP) and `/sse` (legacy) endpoints
- **Security Layers**: SQL injection protection, input validation with Zod, role-based access control

## Security Considerations:

For security considerations, use the MCP-SECURITY-CHECKLIST.md file to ensure that the MCP server is secure.

**Critical Security Patterns from Example:**
- **Input Validation**: All tool inputs validated with Zod schemas
- **SQL Injection Protection**: Pattern-based validation and write operation detection
- **Access Control**: User permissions based on GitHub username with `ALLOWED_USERNAMES` set
- **Error Sanitization**: Database errors formatted to hide sensitive information  
- **Cookie Security**: HMAC-signed cookies for approval persistence

## Development Setup

Based on the MCP TypeScript SDK documentation, future development will likely require:

```bash
# Install dependencies (when package.json exists)
npm install

# Start development server (stdio transport)
npm run dev

# Start HTTP server (if implementing streamable HTTP transport)
npm run start

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

## MCP Architecture

This shopping MCP server will follow the standard MCP pattern with three main components:

### Resources

- **Product catalogs**: Expose product data as readable resources
- **Shopping lists**: User's shopping lists and wish lists
- **Order history**: Past purchases and transaction data
- **Store information**: Details about retailers and locations

### Tools

- **Product search**: Search for products across catalogs
- **Add to cart**: Add items to shopping carts
- **Price comparison**: Compare prices across different stores
- **Order tracking**: Track shipments and delivery status
- **Inventory check**: Check product availability

### Prompts

- **Shopping recommendations**: Generate personalized product suggestions
- **Deal analysis**: Analyze and summarize deals and discounts
- **Product reviews**: Summarize customer reviews and ratings

## Implementation Patterns

When implementing the MCP server:

1. **Use McpServer from @modelcontextprotocol/sdk/server/mcp.js**
2. **Register tools with registerTool() method**
3. **Register resources with registerResource() method**
4. **Register prompts with registerPrompt() method**
5. **Use StdioServerTransport for CLI integration**
6. **Use StreamableHTTPServerTransport for web integration**

## Configuration

The server will need configuration for:

- Shopping API endpoints and credentials
- Supported retailers and their APIs
- Cache settings for product data
- Rate limiting for external API calls

## Security Considerations

- Never expose API keys or credentials in code
- Validate all user inputs to tools
- Implement proper error handling for external API failures
- Use secure authentication for shopping accounts when needed

## Testing

Use the MCP Inspector for testing: https://github.com/modelcontextprotocol/inspector

## Key Files Structure (Future)

```
src/
├── server.ts          # Main MCP server setup
├── tools/             # Shopping tools implementation
│   ├── search.ts      # Product search functionality
│   ├── cart.ts        # Shopping cart operations
│   └── orders.ts      # Order management
├── resources/         # Shopping resources
│   ├── products.ts    # Product catalog resources
│   └── stores.ts      # Store information resources
├── prompts/           # Shopping prompts
│   └── recommendations.ts
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```
