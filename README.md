# Shopping MCP Server

A Model Context Protocol (MCP) server that provides shopping tools and integrations for Israeli e-commerce websites including Rami Levy and Shufersal.

## Features

- **Product Search**: Search for products across supported shopping websites
- **Cart Management**: Add items to cart, remove items, update quantities
- **Price Comparison**: Compare prices and find the best deals
- **Sale Detection**: Automatically detect and calculate sale prices with complex discount logic
- **Store Availability**: Check product availability in specific store locations
- **Multi-language Support**: Hebrew search support for Israeli websites

## Supported Websites

### 1. Rami Levy (rami-levy.co.il)

- ✅ Product search
- ✅ Add to cart
- ⚠️ Remove from cart - not working
- ✅ Update cart quantity
- ✅ Get cart contents
- ✅ Sale price calculations with bulk discounts
- ✅ Store availability filtering
- ✅ Club member discount detection

### 2. Shufersal (shufersal.co.il)

- ✅ Product search
- ✅ Add to cart
- ⚠️ Remove from cart
- ⚠️ Get cart contents
- ⚠️ Update cart quantity (not implemented)

## Environment Variables Setup

### Rami Levy Configuration

To use Rami Levy shopping features, you need the following environment variables:

```bash
# Required: API Bearer token for authentication
RAMI_LEVY_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjIxNzE5ZDM2NzI0OGYyZDAwY2RkMThmM2U5ZmJhNGYxYTU1OTRkYjZlYjI3ODY4ZTlmZmJhNWI0YTdmNTc2Y2IwNDg3N2FiNjY1ODMwYWNjIn0...

# Required: E-commerce token for API requests
RAMI_LEVY_ECOM_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3d3dy1hcGkucmFtaS1sZXZ5LmNvLmlsIiwiYXVkIjoiaHR0cHM6Ly93d3ctYXBpLnJhbWktbGV2eS5jby5pbCIsImlhdCI6MTc1NTUwOTE2Ny4wNjU5NDk...

# Required: Session cookies for maintaining user session
RAMI_LEVY_COOKIE=i18n_redirected=he; auth.strategy=local; _gcl_au=1.1.1435272800.1754844235; glassix-visitor-id-v2-1b400cb9-1c7a-4bb6-a24c-bca2de4b546b=7ab01641-d0d7-48ce-8dd9-44db6c3e71b0...

# Required: User ID for cart operations
RAMI_LEVY_USER_ID=1092301
```

**How to obtain Rami Levy tokens:**

1. **Login to Rami Levy website**: Go to [rami-levy.co.il](https://www.rami-levy.co.il) and login
2. **Open Developer Tools**: Press F12 in your browser
3. **Go to Network tab**: Monitor network requests
4. **Make a search or add item to cart**: This will trigger API calls
5. **Find API requests**: Look for requests to `www-api.rami-levy.co.il` or `www.rami-levy.co.il/api`
6. **Extract headers**:
   - `Authorization: Bearer <token>` → Copy to `RAMI_LEVY_API_KEY`
   - `Ecomtoken: <token>` → Copy to `RAMI_LEVY_ECOM_TOKEN`
   - `Cookie: <full-cookie-string>` → Copy to `RAMI_LEVY_COOKIE`
7. **Get User ID**: Check the API response for user cart data or profile info

### Shufersal Configuration

To use Shufersal shopping features, you need the following environment variables:

```bash
# Required: CSRF token for cart operations
SHUFERSAL_CSRF_TOKEN=0aaad81d-ce56-455e-a4f9-870adc30600e

# Required: Session cookies for authentication
SHUFERSAL_COOKIE=JSESSIONID=DB3FA1395BAFD1686D223B0EE586BF03; XSRF-TOKEN=0aaad81d-ce56-455e-a4f9-870adc30600e; miglog-cart=eb552421-b231-4f4a-8d8f-5d092910420d...
```

**How to obtain Shufersal tokens:**

1. **Login to Shufersal website**: Go to [shufersal.co.il](https://www.shufersal.co.il) and login
2. **Open Developer Tools**: Press F12 in your browser
3. **Go to Network tab**: Monitor network requests
4. **Add item to cart**: This will trigger the cart API
5. **Find the cart/add request**: Look for POST requests to `/online/he/cart/add`
6. **Extract headers**:
   - Look for `csrftoken` header → Copy to `SHUFERSAL_CSRF_TOKEN`
   - Copy full `Cookie` header → Copy to `SHUFERSAL_COOKIE`
   - Alternative: Look for `XSRF-TOKEN` in cookies → Can be used as CSRF token

## Installation & Setup

1. **Clone the repository**:

```bash
git clone <repository-url>
cd shopping-mcp
```

2. **Install dependencies**:

```bash
npm install
```

3. **Create environment file**:

```bash
cp .dev.vars.example .dev.vars
```

4. **Configure environment variables**: Edit `.dev.vars` with your tokens (see above)

5. **Start development server**:

```bash
npm run dev
# or
wrangler dev
```

## Usage Examples

### Search Products

```javascript
// Search for milk in Hebrew
await searchProducts({
  website: "rami-levy",
  query: "חלב",
  category: "dairy",
});

// Search with price range
await searchProducts({
  website: "shufersal",
  query: "יוגורט",
  priceRange: { min: 5, max: 20 },
});
```

### Cart Operations

```javascript
// Add item to cart
await addToCart({
  website: "rami-levy",
  productId: "123456",
  quantity: 2,
});

// View cart contents
await getCartContents({
  website: "rami-levy",
});

// Update quantity
await updateCartQuantity({
  website: "rami-levy",
  cartItemId: "rami-levy-123456",
  quantity: 3,
});

// Remove from cart
await removeFromCart({
  website: "shufersal",
  cartItemId: "0",
});
```

## Sale Price Logic

### Rami Levy Sale Calculations

Rami Levy supports complex sale structures:

- **cmt**: Quantity needed for discount
- **scm**: Total price for discount quantity
- **max_in_doc**: Maximum quantity that can get the discount
- **is_club**: 1 if club members only

**Examples**:

- Sale: "2 for 10 ILS" (regular price 6 ILS each)
  - Buy 2: Pay 10 ILS (save 2 ILS)
  - Buy 3: Pay 16 ILS (10 + 6)
- Sale with limit: "3 for 15 ILS, max 6 items"
  - Buy 6: Pay 30 ILS (15 + 15)
  - Buy 9: Pay 48 ILS (15 + 15 + 18)

## Store Availability

### Rami Levy Store Filtering

- Default store: 331 (configurable)
- Products not available in store are marked with ❌
- Unavailable items shown with "Not available in store X" message

## Security Features

- Input validation and sanitization
- SQL injection protection
- Rate limiting per website
- Secure error handling
- Authentication token management

## API Endpoints

The MCP server exposes these tools:

- `searchProducts` - Search for products
- `addToCart` - Add items to shopping cart
- `removeFromCart` - Remove items from cart
- `updateCartQuantity` - Update item quantities
- `getCartContents` - View current cart

## Error Handling

Common errors and solutions:

- **Missing tokens**: Ensure all required environment variables are set
- **Invalid tokens**: Tokens may expire, re-extract from browser
- **Cart operations fail**: Check authentication cookies are fresh
- **Product not found**: Use exact product ID from search results
- **Store not available**: Product may not be in stock at selected store

## Development

### Project Structure

```
src/
├── tools/
│   ├── shopping/
│   │   ├── adapters/
│   │   │   ├── base-adapter.ts        # Base adapter class
│   │   │   ├── rami-levy-adapter.ts   # Rami Levy implementation
│   │   │   └── shufersal-adapter.ts   # Shufersal implementation
│   │   ├── factory.ts                 # Adapter factory
│   │   ├── security.ts                # Security validation
│   │   └── types.ts                   # Type definitions
│   └── shopping-tools.ts              # MCP tool registration
└── utils/
    └── api-client.ts                  # HTTP client
```

### Adding New Websites

1. Create new adapter extending `BaseShoppingAdapter`
2. Implement required methods: `searchProducts`, `addToCart`, etc.
3. Add website to `SupportedWebsite` type
4. Register in `ShoppingAdapterFactory`
5. Add environment variable configuration

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- Check error messages in console logs
- Verify environment variables are set correctly
- Ensure tokens haven't expired
- Test with MCP Inspector: https://github.com/modelcontextprotocol/inspector
