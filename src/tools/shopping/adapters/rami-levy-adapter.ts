import { BaseShoppingAdapter } from "./base-adapter";
import {
  ProductSearchOptions,
  ProductSearchResult,
  CartItem,
  Cart,
  ShoppingOperationResult,
  WebsiteConfig,
  WebsiteCredentials,
  Product,
} from "../types";
import { ApiClient } from "../../../utils/api-client";

/**
 * Rami Levy shopping adapter implementation
 * Integrates with rami-levy.co.il API
 */
export class RamiLevyAdapter extends BaseShoppingAdapter {
  private apiClient: ApiClient;
  private store: string = "331"; // Default store

  constructor(credentials?: WebsiteCredentials) {
    const config: WebsiteConfig = {
      name: "Rami Levy",
      baseUrl: "https://www.rami-levy.co.il/api",
      apiVersion: "v2",
      rateLimitPerMinute: 60,
      requiresAuth: true,
      authType: "api_key",
    };

    super("rami-levy", config, credentials);

    if (!this.validateConfig()) {
      throw new Error(
        "Rami Levy adapter requires API key, ecom token, and cookie credentials"
      );
    }

    // Initialize API client with Rami Levy specific headers
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
      locale: "he",
      origin: "https://www.rami-levy.co.il",
      referer: "https://www.rami-levy.co.il/he/online/search",
    };

    if (credentials?.apiKey) {
      headers["Authorization"] = `Bearer ${credentials.apiKey}`;
    } else {
      throw new Error("Rami Levy adapter requires API key");
    }
    if (credentials?.accessToken) {
      // Using accessToken for ecomtoken
      headers["Ecomtoken"] = credentials.accessToken;
    } else {
      throw new Error("Rami Levy adapter requires ecom token");
    }
    if (credentials?.refreshToken) {
      // Using refreshToken for cookie
      headers["Cookie"] = credentials.refreshToken;
    } else {
      throw new Error("Rami Levy adapter requires cookie");
    }

    this.apiClient = new ApiClient(config.baseUrl, headers);
  }

  async searchProducts(
    options: ProductSearchOptions
  ): Promise<ShoppingOperationResult<ProductSearchResult>> {
    try {
      console.log(`[Rami Levy] Searching for: "${options.query}"`);

      // Call Rami Levy catalog API
      const payload = {
        q: options.query,
        store: this.store,
        aggs: 1,
      };

      const response = await this.apiClient.post("/catalog", payload);

      // Parse response according to Rami Levy API structure
      const ramiLevyResponse = response as {
        data: Array<{
          id: number;
          name: string;
          price: { price: number };
          images?: { small?: string };
          [key: string]: any;
        }>;
        total: number;
        status: number;
      };

      if (ramiLevyResponse.status !== 200) {
        return this.createErrorResult("Search request failed");
      }

      // Transform Rami Levy products to our standard format
      const products: Product[] = ramiLevyResponse.data.map((item) => {
        const product = {
          id: item.id.toString(),
          title: item.name,
          description: item.name, // Rami Levy doesn't provide separate description
          price: item.price.price,
          currency: "ILS", // Israeli Shekel
          imageUrl: item.images?.small
            ? `https://www.rami-levy.co.il${item.images.small}`
            : undefined,
          availability: true, // Assume available if returned in search
          category: options.category,
          brand: "Rami Levy",
        };

        return this.sanitizeProduct(product);
      });

      // Apply client-side filtering if needed
      let filteredProducts = products;

      // TODO: Check if we need that price range filtering
      // if (options.priceRange) {
      //   filteredProducts = products.filter(
      //     (product) =>
      //       product.price >= options.priceRange!.min &&
      //       product.price <= options.priceRange!.max
      //   );
      // }

      const result: ProductSearchResult = {
        products: filteredProducts,
        totalCount: filteredProducts.length,
        hasMore: ramiLevyResponse.total > ramiLevyResponse.data.length,
      };

      return this.createSuccessResult(result);
    } catch (error) {
      console.error("[Rami Levy] Search error:", error);
      return this.createErrorResult(
        `Failed to search products on Rami Levy: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async addToCart(
    productId: string,
    quantity: number,
    variant?: string
  ): Promise<ShoppingOperationResult<CartItem>> {
    try {
      console.log(`[Rami Levy] Adding to cart: ${productId}, qty: ${quantity}`);

      const payload = {
        store: this.store,
        isClub: 0,
        supplyAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        items: {
          [productId]: quantity.toString(),
        },
        meta: null,
      };

      const response = await this.apiClient.post("/v2/cart", payload);

      // Parse cart response
      const cartResponse = response as {
        items: Array<{
          id: number;
          name: string;
          price: number;
          quantity: number;
          FormatedTotalPrice: number;
          [key: string]: any;
        }>;
        status: number;
      };

      if (cartResponse.status !== 200) {
        return this.createErrorResult("Failed to add item to cart");
      }

      // Find the added item in the response
      const addedItem = cartResponse.items.find(
        (item) => item.id.toString() === productId
      );

      if (!addedItem) {
        return this.createErrorResult("Item was not added to cart");
      }

      const cartItem: CartItem = {
        id: `rami-levy-${addedItem.id}`,
        productId: productId,
        productTitle: addedItem.name,
        quantity: addedItem.quantity,
        unitPrice: addedItem.price,
        totalPrice:
          addedItem.FormatedTotalPrice || addedItem.price * addedItem.quantity,
        variant: variant,
      };

      return this.createSuccessResult(cartItem);
    } catch (error) {
      console.error("[Rami Levy] Add to cart error:", error);
      return this.createErrorResult(
        `Failed to add product to Rami Levy cart: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async removeFromCart(
    cartItemId: string
  ): Promise<ShoppingOperationResult<boolean>> {
    try {
      console.log(`[Rami Levy] Removing from cart: ${cartItemId}`);

      // First get current cart to build updated items list
      const currentCartResult = await this.getCartContents();
      if (!currentCartResult.success) {
        return this.createErrorResult("Failed to get current cart contents");
      }

      const currentCart = currentCartResult.data!;

      // Remove the item by excluding it from the items list
      const updatedItems = currentCart.items
        .filter((item) => item.id !== cartItemId)
        .reduce(
          (acc, item) => {
            // Extract original product ID from our cart item ID
            const productId = item.productId;
            acc[productId] = item.quantity.toString();
            return acc;
          },
          {} as Record<string, string>
        );

      const payload = {
        store: this.store,
        isClub: 0,
        supplyAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        items: updatedItems,
        meta: null,
      };

      const response = await this.apiClient.post("/v2/cart", payload);

      const cartResponse = response as { status: number };

      if (cartResponse.status !== 200) {
        return this.createErrorResult("Failed to remove item from cart");
      }

      return this.createSuccessResult(true);
    } catch (error) {
      console.error("[Rami Levy] Remove from cart error:", error);
      return this.createErrorResult(
        `Failed to remove item from Rami Levy cart: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async updateCartQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<ShoppingOperationResult<CartItem>> {
    try {
      console.log(
        `[Rami Levy] Updating cart quantity: ${cartItemId}, new qty: ${quantity}`
      );

      // Get current cart
      const currentCartResult = await this.getCartContents();
      if (!currentCartResult.success) {
        return this.createErrorResult("Failed to get current cart contents");
      }

      const currentCart = currentCartResult.data!;

      // Find the item to update
      const itemToUpdate = currentCart.items.find(
        (item) => item.id === cartItemId
      );
      if (!itemToUpdate) {
        return this.createErrorResult("Cart item not found");
      }

      // If quantity is 0, remove the item
      if (quantity === 0) {
        const removeResult = await this.removeFromCart(cartItemId);
        if (!removeResult.success) {
          return this.createErrorResult(
            removeResult.error || "Failed to remove item"
          );
        }

        // Return empty cart item to indicate removal
        const removedItem: CartItem = {
          id: cartItemId,
          productId: itemToUpdate.productId,
          productTitle: itemToUpdate.productTitle,
          quantity: 0,
          unitPrice: itemToUpdate.unitPrice,
          totalPrice: 0,
        };

        return this.createSuccessResult(removedItem);
      }

      // Build updated items list with new quantity
      const updatedItems = currentCart.items.reduce(
        (acc, item) => {
          const productId = item.productId;
          const newQty = item.id === cartItemId ? quantity : item.quantity;
          acc[productId] = newQty.toString();
          return acc;
        },
        {} as Record<string, string>
      );

      const payload = {
        store: this.store,
        isClub: 0,
        supplyAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        items: updatedItems,
        meta: null,
      };

      const response = await this.apiClient.post("/v2/cart", payload);

      const cartResponse = response as {
        items: Array<{
          id: number;
          name: string;
          price: number;
          quantity: number;
          FormatedTotalPrice: number;
        }>;
        status: number;
      };

      if (cartResponse.status !== 200) {
        return this.createErrorResult("Failed to update cart quantity");
      }

      // Find the updated item
      const updatedItem = cartResponse.items.find(
        (item) => item.id.toString() === itemToUpdate.productId
      );

      if (!updatedItem) {
        return this.createErrorResult(
          "Updated item not found in cart response"
        );
      }

      const cartItem: CartItem = {
        id: cartItemId,
        productId: itemToUpdate.productId,
        productTitle: updatedItem.name,
        quantity: updatedItem.quantity,
        unitPrice: updatedItem.price,
        totalPrice:
          updatedItem.FormatedTotalPrice ||
          updatedItem.price * updatedItem.quantity,
      };

      return this.createSuccessResult(cartItem);
    } catch (error) {
      console.error("[Rami Levy] Update cart quantity error:", error);
      return this.createErrorResult(
        `Failed to update Rami Levy cart quantity: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getCartContents(): Promise<ShoppingOperationResult<Cart>> {
    try {
      console.log(`[Rami Levy] Getting cart contents`);

      const response = await this.apiClient.get("/v2/cart");

      const cartResponse = response as {
        items: Array<{
          id: number;
          name: string;
          price: number;
          quantity: number;
          FormatedTotalPrice: number;
          FormatedSavePrice?: number;
          [key: string]: any;
        }>;
        price: number;
        priceClub: number;
        discount: number;
        quantity: number;
        status: number;
      };

      if (cartResponse.status !== 200) {
        return this.createErrorResult("Failed to get cart contents");
      }

      // Transform Rami Levy cart items to our standard format
      const cartItems: CartItem[] = cartResponse.items.map((item) => ({
        id: `rami-levy-${item.id}`,
        productId: item.id.toString(),
        productTitle: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.FormatedTotalPrice || item.price * item.quantity,
      }));

      const cart: Cart = {
        items: cartItems,
        totalItems: cartResponse.quantity,
        totalPrice: cartResponse.price,
        currency: "ILS",
      };

      return this.createSuccessResult(cart);
    } catch (error) {
      console.error("[Rami Levy] Get cart contents error:", error);
      return this.createErrorResult(
        `Failed to get Rami Levy cart contents: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
