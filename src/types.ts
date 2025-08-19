import { z } from "zod";

// User context passed through OAuth (will be used later for authentication)
export type Props = {
  login?: string;
  name?: string;
  email?: string;
  accessToken?: string;
};

// MCP tool schemas using Zod
export const CalculateSchema = {
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("The mathematical operation to perform"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
};

// Shopping tool schemas
export const SearchProductsSchema = {
  website: z
    .enum(["rami-levy", "shufersal"]) // "amazon", "shopify" - commented out for now
    .describe("Shopping website to search"),
  query: z
    .string()
    .min(1, "Search query cannot be empty")
    .describe("Product search query"),
  category: z
    .string()
    .optional()
    .describe("Product category filter"),
  priceRange: z
    .object({
      min: z.number().min(0).describe("Minimum price"),
      max: z.number().min(0).describe("Maximum price"),
    })
    .optional()
    .describe("Price range filter"),
};

export const AddToCartSchema = {
  website: z
    .enum(["rami-levy", "shufersal"]) // "amazon", "shopify" - commented out for now
    .describe("Shopping website"),
  productId: z
    .string()
    .min(1, "Product ID cannot be empty")
    .describe("Unique product identifier"),
  quantity: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(1)
    .describe("Quantity to add to cart"),
  variant: z
    .string()
    .optional()
    .describe("Product variant (size, color, etc.)"),
};

export const RemoveFromCartSchema = {
  website: z
    .enum(["rami-levy", "shufersal"]) // "amazon", "shopify" - commented out for now
    .describe("Shopping website"),
  cartItemId: z
    .string()
    .min(1, "Cart item ID cannot be empty")
    .describe("Cart item identifier to remove"),
};

export const UpdateCartQuantitySchema = {
  website: z
    .enum(["rami-levy", "shufersal"]) // "amazon", "shopify" - commented out for now
    .describe("Shopping website"),
  cartItemId: z
    .string()
    .min(1, "Cart item ID cannot be empty")
    .describe("Cart item identifier to update"),
  quantity: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("New quantity (0 to remove item)"),
};

export const GetCartContentsSchema = {
  website: z
    .enum(["rami-levy", "shufersal"]) // "amazon", "shopify" - commented out for now
    .describe("Shopping website"),
};

// MCP response types
export interface McpTextContent {
  type: "text";
  text: string;
  isError?: boolean;
}

export interface McpResponse {
  content: McpTextContent[];
}

// Standard response creators
export function createSuccessResponse(
  message: string,
  data?: any
): McpResponse {
  let text = `**Success**\n\n${message}`;
  if (data !== undefined) {
    text += `\n\n**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

export function createErrorResponse(
  message: string,
  details?: any
): McpResponse {
  let text = `**Error**\n\n${message}`;
  if (details !== undefined) {
    text += `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
  }
  return {
    content: [
      {
        type: "text",
        text,
        isError: true,
      },
    ],
  };
}
