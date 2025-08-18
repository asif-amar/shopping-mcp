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

Based on the example MCP server, our shopping server will use:

```bash
# Install dependencies
npm install

# Development (Cloudflare Workers with Wrangler)
wrangler dev                    # Start local development server
npm run dev                     # Alternative via npm script

# Type checking and validation
npm run type-check              # TypeScript compilation check
wrangler types                  # Generate Cloudflare Worker types

# Testing
npm test                        # Unit tests (if configured)
npm run test:ui                 # Test UI interface

# Production deployment
wrangler deploy                 # Deploy to Cloudflare Workers

# Environment setup
cp .dev.vars.example .dev.vars  # Create local environment file
wrangler secret put API_KEY     # Set production secrets
```

**Development Dependencies from Example:**
- `@modelcontextprotocol/sdk` - Core MCP SDK
- `agents/mcp` - Cloudflare Workers MCP framework
- `@cloudflare/workers-oauth-provider` - OAuth implementation
- `hono` - Fast web framework for Workers
- `zod` - Input validation schemas
- `vitest` - Testing framework

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

Based on the example server, implement the shopping MCP server following these patterns:

**1. MCP Agent Class Structure:**
```typescript
export class ShoppingMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Shopping MCP Server", 
    version: "1.0.0"
  });

  async init() {
    // Register all shopping tools
    registerAllShoppingTools(this.server, this.env, this.props);
  }
}
```

**2. Modular Tool Registration:**
```typescript
// tools/register-tools.ts
export function registerAllShoppingTools(server: McpServer, env: Env, props: Props) {
  registerProductTools(server, env, props);
  registerCartTools(server, env, props);
  registerOrderTools(server, env, props);
}
```

**3. Zod Input Validation:**
```typescript
// All tool inputs must use Zod schemas
const ProductSearchSchema = {
  query: z.string().min(1, "Search query cannot be empty"),
  category: z.string().optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional()
};
```

**4. OAuth Provider Integration:**
```typescript
export default new OAuthProvider({
  apiHandlers: {
    '/sse': ShoppingMCP.serveSSE('/sse') as any,
    '/mcp': ShoppingMCP.serve('/mcp') as any,
  },
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  defaultHandler: GitHubHandler as any,
});
```

**5. Standardized Response Format:**
```typescript
// Use consistent success/error response patterns
return createSuccessResponse(
  "Product search completed",
  { products: results, totalFound: results.length }
);

return createErrorResponse(
  "Product search failed", 
  { error: formatApiError(error) }
);
```

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

## Key Files Structure (Based on Example)

```
src/
├── index.ts                    # Main MCP server with OAuth
├── index_sentry.ts            # Sentry-enabled version (optional)
├── simple-shopping.ts         # Basic shopping example (no auth)
├── auth/                      # Authentication layer
│   ├── github-handler.ts      # GitHub OAuth implementation
│   └── oauth-utils.ts         # OAuth utility functions
├── tools/                     # Shopping tools implementation
│   ├── register-tools.ts      # Central tool registration
│   ├── product-tools.ts       # Product search and management
│   ├── cart-tools.ts          # Shopping cart operations
│   └── order-tools.ts         # Order management tools
├── database/                  # Data layer (if using database)
│   ├── connection.ts          # Database connection management
│   ├── security.ts            # Input validation and security
│   └── utils.ts               # Database utility functions
├── types.ts                   # TypeScript type definitions
└── utils/                     # General utility functions

# Configuration files
├── package.json               # Dependencies and scripts
├── wrangler.jsonc            # Cloudflare Workers configuration
├── tsconfig.json             # TypeScript configuration
├── .dev.vars.example         # Environment variables template
└── vitest.config.js          # Testing configuration
```

**Key Files to Create First:**
1. `package.json` - Project dependencies
2. `wrangler.jsonc` - Workers configuration
3. `src/types.ts` - Type definitions
4. `src/index.ts` - Main MCP server
5. `src/tools/register-tools.ts` - Tool registration system
