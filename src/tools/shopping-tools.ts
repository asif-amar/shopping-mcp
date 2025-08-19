import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  Props,
  SearchProductsSchema,
  AddToCartSchema,
  RemoveFromCartSchema,
  UpdateCartQuantitySchema,
  GetCartContentsSchema,
} from "../types";
import { ShoppingAdapterFactory } from "./shopping/factory";
import { ShoppingSecurity } from "./shopping/security";

export function registerShoppingTools(
  server: McpServer,
  env: Env,
  _props: Props
) {
  // Tool 1: Search Products
  server.tool(
    "searchProducts",
    "Search for products on supported shopping websites (Rami Levy, Shufersal). Returns product information including title, price, availability, and ratings. You must search in Hebrew for Israeli websites, example: milk -> חלב",
    SearchProductsSchema,
    async ({ website, query, category, priceRange }) => {
      try {
        console.log(`[Shopping] Searching "${query}" on ${website}`);

        // Security validation
        const queryValidation = ShoppingSecurity.validateSearchQuery(query);
        if (!queryValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${queryValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        const categoryValidation = ShoppingSecurity.validateCategory(category);
        if (!categoryValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${categoryValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        const priceRangeValidation =
          ShoppingSecurity.validatePriceRange(priceRange);
        if (!priceRangeValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${priceRangeValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        // Get adapter for the website
        const adapter = ShoppingAdapterFactory.getAdapter(website, env);

        // Execute search
        const result = await adapter.searchProducts({
          query: queryValidation.sanitized,
          category: categoryValidation.sanitized,
          priceRange,
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\nSearch failed: ${ShoppingSecurity.formatSecureError(result.error || "Unknown error")}`,
                isError: true,
              },
            ],
          };
        }

        const products = result.data?.products || [];
        const totalCount = result.data?.totalCount || 0;

        return {
          content: [
            {
              type: "text",
              text: `**Product Search Results**\n\n**Website:** ${website.toUpperCase()}\n**Query:** "${query}"\n**Found:** ${totalCount} products\n\n${products
                .map(
                  (product, index) =>
                    `**${index + 1}. ${product.title}**\n` +
                    `- **Price:** ${product.currency} ${product.price}\n` +
                    `- **Availability:** ${product.availability ? "In Stock" : "Out of Stock"}\n` +
                    `- **Rating:** ${product.rating ? `${product.rating}/5 (${product.reviewCount} reviews)` : "No rating"}\n` +
                    `- **Category:** ${product.category || "N/A"}\n` +
                    `- **Product ID:** ${product.id}\n` +
                    `- **Description:** ${product.description.slice(0, 150)}${product.description.length > 150 ? "..." : ""}\n`
                )
                .join("\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("[Shopping] Search error:", error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to search products: ${ShoppingSecurity.formatSecureError(error instanceof Error ? error.message : "Unknown error")}`,
              isError: true,
            },
          ],
        };
      }
    }
  );

  // Tool 2: Add to Cart
  server.tool(
    "addToCart",
    "Add a product to the shopping cart on the specified website. Requires product ID from search results.",
    AddToCartSchema,
    async ({ website, productId, quantity, variant }) => {
      try {
        console.log(
          `[Shopping] Adding to cart: ${productId} (${quantity}) on ${website}`
        );

        // Security validation
        const productIdValidation = ShoppingSecurity.validateProductId(
          productId,
          website
        );
        if (!productIdValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${productIdValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        const quantityValidation = ShoppingSecurity.validateQuantity(quantity);
        if (!quantityValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${quantityValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        const variantValidation = ShoppingSecurity.validateVariant(variant);
        if (!variantValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${variantValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        // Get adapter for the website
        const adapter = ShoppingAdapterFactory.getAdapter(website, env);

        // Add to cart
        const result = await adapter.addToCart(
          productId,
          quantity,
          variantValidation.sanitized
        );

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\nFailed to add to cart: ${ShoppingSecurity.formatSecureError(result.error || "Unknown error")}`,
                isError: true,
              },
            ],
          };
        }

        const cartItem = result.data!;

        return {
          content: [
            {
              type: "text",
              text: `**Added to Cart**\n\n**Website:** ${website.toUpperCase()}\n**Product:** ${cartItem.productTitle}\n**Quantity:** ${cartItem.quantity}\n**Unit Price:** ${cartItem.totalPrice / cartItem.quantity}\n**Total Price:** ${cartItem.totalPrice}\n**Cart Item ID:** ${cartItem.id}${cartItem.variant ? `\n**Variant:** ${cartItem.variant}` : ""}`,
            },
          ],
        };
      } catch (error) {
        console.error("[Shopping] Add to cart error:", error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to add to cart: ${ShoppingSecurity.formatSecureError(error instanceof Error ? error.message : "Unknown error")}`,
              isError: true,
            },
          ],
        };
      }
    }
  );

  // Tool 3: Remove from Cart
  server.tool(
    "removeFromCart",
    "Remove an item from the shopping cart. Requires cart item ID from previous cart operations.",
    RemoveFromCartSchema,
    async ({ website, cartItemId }) => {
      try {
        console.log(
          `[Shopping] Removing from cart: ${cartItemId} on ${website}`
        );

        // Security validation
        const cartItemValidation =
          ShoppingSecurity.validateCartItemId(cartItemId);
        if (!cartItemValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${cartItemValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        // Get adapter for the website
        const adapter = ShoppingAdapterFactory.getAdapter(website, env);

        // Remove from cart
        const result = await adapter.removeFromCart(cartItemId);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\nFailed to remove from cart: ${ShoppingSecurity.formatSecureError(result.error || "Unknown error")}`,
                isError: true,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `**Removed from Cart**\n\n**Website:** ${website.toUpperCase()}\n**Cart Item:** ${cartItemId}\n**Status:** Successfully removed`,
            },
          ],
        };
      } catch (error) {
        console.error("[Shopping] Remove from cart error:", error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to remove from cart: ${ShoppingSecurity.formatSecureError(error instanceof Error ? error.message : "Unknown error")}`,
              isError: true,
            },
          ],
        };
      }
    }
  );

  // Tool 4: Update Cart Quantity
  server.tool(
    "updateCartQuantity",
    "Update the quantity of an item in the shopping cart. Set quantity to 0 to remove the item.",
    UpdateCartQuantitySchema,
    async ({ website, cartItemId, quantity }) => {
      try {
        console.log(
          `[Shopping] Updating cart quantity: ${cartItemId} to ${quantity} on ${website}`
        );

        // Security validation
        const cartItemValidation =
          ShoppingSecurity.validateCartItemId(cartItemId);
        if (!cartItemValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${cartItemValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        const quantityValidation = ShoppingSecurity.validateQuantity(quantity);
        if (!quantityValidation.isValid) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\n${quantityValidation.error}`,
                isError: true,
              },
            ],
          };
        }

        // Get adapter for the website
        const adapter = ShoppingAdapterFactory.getAdapter(website, env);

        // Update quantity
        const result = await adapter.updateCartQuantity(cartItemId, quantity);

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\nFailed to update cart quantity: ${ShoppingSecurity.formatSecureError(result.error || "Unknown error")}`,
                isError: true,
              },
            ],
          };
        }

        const cartItem = result.data!;

        return {
          content: [
            {
              type: "text",
              text: `**Cart Updated**\n\n**Website:** ${website.toUpperCase()}\n**Product:** ${cartItem.productTitle}\n**New Quantity:** ${cartItem.quantity}\n**Unit Price:** ${cartItem.unitPrice}\n**New Total Price:** ${cartItem.totalPrice}`,
            },
          ],
        };
      } catch (error) {
        console.error("[Shopping] Update cart quantity error:", error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to update cart quantity: ${ShoppingSecurity.formatSecureError(error instanceof Error ? error.message : "Unknown error")}`,
              isError: true,
            },
          ],
        };
      }
    }
  );

  // Tool 5: Get Cart Contents
  server.tool(
    "getCartContents",
    "View the current contents of the shopping cart, including all items, quantities, and total price.",
    GetCartContentsSchema,
    async ({ website }) => {
      try {
        console.log(`[Shopping] Getting cart contents for ${website}`);

        // Get adapter for the website
        const adapter = ShoppingAdapterFactory.getAdapter(website, env);

        // Get cart contents
        const result = await adapter.getCartContents();

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text: `**Error**\n\nFailed to get cart contents: ${ShoppingSecurity.formatSecureError(result.error || "Unknown error")}`,
                isError: true,
              },
            ],
          };
        }

        const cart = result.data!;

        if (cart.items.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `**Shopping Cart**\n\n**Website:** ${website.toUpperCase()}\n**Status:** Empty\n**Total Items:** 0\n**Total Price:** ${cart.currency} 0.00`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `**Shopping Cart**\n\n**Website:** ${website.toUpperCase()}\n**Total Items:** ${cart.totalItems}\n**Total Price:** ${cart.currency} ${cart.totalPrice}\n\n**Items:**\n${cart.items
                .map(
                  (item, index) =>
                    `${index + 1}. **${item.productTitle}**\n` +
                    `   - Quantity: ${item.quantity}\n` +
                    `   - Unit Price: ${cart.currency} ${item.unitPrice}\n` +
                    `   - Total: ${cart.currency} ${item.totalPrice}\n` +
                    `   - Cart Item ID: ${item.id}` +
                    `${item.variant ? `\n   - Variant: ${item.variant}` : ""}`
                )
                .join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("[Shopping] Get cart contents error:", error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\nFailed to get cart contents: ${ShoppingSecurity.formatSecureError(error instanceof Error ? error.message : "Unknown error")}`,
              isError: true,
            },
          ],
        };
      }
    }
  );
}
