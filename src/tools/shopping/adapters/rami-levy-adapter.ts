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

// Rami Levy API response interfaces
interface RamiLevyUserCartResponse {
  cart: {
    uid: number;
    updated_at: string;
    last_update: number;
    items: Record<string, number>; // product ID -> quantity
  };
  shopLists: any;
  user: any;
}

interface RamiLevySaleData {
  code: number;
  cmt: number; // quantity needed for discount
  scm: number; // total price for discount quantity
  label: string;
  name: string;
  from: string;
  to: string;
  is_club: number; // 1 if club members only
  active: number;
  max_in_doc?: number; // maximum quantity that can get the discount
}

interface RamiLevyProductData {
  id: number;
  name: string;
  price: {
    price: number;
  };
  images: {
    small: string;
    original: string;
    trim: string;
    transparent: string;
    gallery: any[];
  };
  available_in: number[];
  sale: RamiLevySaleData[];
  gs?: {
    BrandName?: string;
    name?: string;
    short_name?: string;
  };
  department?: {
    name: string;
    id: number;
  };
  group?: {
    name: string;
    id: number;
  };
}

interface RamiLevyProductsResponse {
  data: RamiLevyProductData[];
  status: string;
  total: number;
}

/**
 * Rami Levy shopping adapter implementation
 * Integrates with rami-levy.co.il API
 */
export class RamiLevyAdapter extends BaseShoppingAdapter {
  private apiClient: ApiClient;
  private userApiClient: ApiClient; // For www-api subdomain
  private store: string = "331"; // Default store

  /**
   * Calculate the best price considering sales and quantity
   */
  private calculateBestPrice(
    product: RamiLevyProductData,
    quantity: number
  ): {
    unitPrice: number;
    totalPrice: number;
    saleInfo?: string;
  } {
    const regularPrice = product.price?.price || 0;
    const regularTotal = regularPrice * quantity;

    // If no sales or quantity is 0, return regular price
    if (!product.sale || product.sale.length === 0 || quantity === 0) {
      return {
        unitPrice: regularPrice,
        totalPrice: regularTotal,
      };
    }

    // Filter active sales and find applicable ones
    const applicableSales = product.sale.filter(
      (sale) =>
        sale.active === 1 &&
        sale.cmt > 0 &&
        sale.scm > 0 &&
        quantity >= sale.cmt // Only consider sales where we have enough quantity
    );

    if (applicableSales.length === 0) {
      return {
        unitPrice: regularPrice,
        totalPrice: regularTotal,
      };
    }

    // Find the best sale (lowest total price per unit when considering bulk discounts)
    let bestSale: RamiLevySaleData | null = null;
    let bestTotalPrice = regularTotal;

    for (const sale of applicableSales) {
      let saleTotal: number;

      if (sale.max_in_doc && sale.max_in_doc > 0) {
        // Handle max_in_doc logic: only up to max_in_doc quantity gets sale price
        const discountedQty = Math.min(quantity, sale.max_in_doc);
        const regularQty = quantity - discountedQty;

        // Calculate how many complete sale units we can buy from the discounted quantity
        const saleUnits = Math.floor(discountedQty / sale.cmt);
        const remainingDiscountedItems = discountedQty % sale.cmt;

        // Total cost = (sale units * sale price) + (remaining discounted items * regular price) + (regular quantity * regular price)
        saleTotal =
          saleUnits * sale.scm +
          remainingDiscountedItems * regularPrice +
          regularQty * regularPrice;
      } else {
        // Original logic: no max_in_doc limit
        const saleUnits = Math.floor(quantity / sale.cmt);
        const remainingItems = quantity % sale.cmt;

        // Total cost = (sale units * sale price) + (remaining items * regular price)
        saleTotal = saleUnits * sale.scm + remainingItems * regularPrice;
      }

      if (saleTotal < bestTotalPrice) {
        bestTotalPrice = saleTotal;
        bestSale = sale;
      }
    }

    if (bestSale) {
      const savings = regularTotal - bestTotalPrice;
      const clubNote = bestSale.is_club === 1 ? " (Club members only)" : "";
      const maxNote =
        bestSale.max_in_doc && bestSale.max_in_doc > 0
          ? ` (Max ${bestSale.max_in_doc} items on sale)`
          : "";

      return {
        unitPrice: bestTotalPrice / quantity, // Effective unit price
        totalPrice: bestTotalPrice,
        saleInfo: `💰 Sale: ${bestSale.cmt} for ${bestSale.scm} ILS (Save ${savings.toFixed(2)} ILS)${clubNote}${maxNote}`,
      };
    }

    // Check if there are sales the user could be eligible for with more items
    const potentialSales = product.sale.filter((sale) => {
      if (sale.active !== 1 || sale.cmt <= 0 || sale.scm <= 0) {
        return false;
      }

      // If max_in_doc is set and user already has more than max_in_doc, no point showing this sale
      if (
        sale.max_in_doc &&
        sale.max_in_doc > 0 &&
        quantity >= sale.max_in_doc
      ) {
        return false;
      }

      // Check if user needs more items to reach the sale threshold
      const effectiveMaxQty =
        sale.max_in_doc && sale.max_in_doc > 0
          ? Math.min(sale.cmt, sale.max_in_doc)
          : sale.cmt;
      return quantity < effectiveMaxQty;
    });

    if (potentialSales.length > 0) {
      // Find the best potential sale
      const bestPotentialSale = potentialSales.reduce((best, current) => {
        const bestUnitPrice = best.scm / best.cmt;
        const currentUnitPrice = current.scm / current.cmt;
        return currentUnitPrice < bestUnitPrice ? current : best;
      });

      const effectiveMaxQty =
        bestPotentialSale.max_in_doc && bestPotentialSale.max_in_doc > 0
          ? Math.min(bestPotentialSale.cmt, bestPotentialSale.max_in_doc)
          : bestPotentialSale.cmt;
      const needed = effectiveMaxQty - quantity;
      const clubNote =
        bestPotentialSale.is_club === 1 ? " (Club members only)" : "";
      const maxNote =
        bestPotentialSale.max_in_doc && bestPotentialSale.max_in_doc > 0
          ? ` (Max ${bestPotentialSale.max_in_doc} items on sale)`
          : "";

      return {
        unitPrice: regularPrice,
        totalPrice: regularTotal,
        saleInfo: `🛒 Add ${needed} more for sale: ${bestPotentialSale.cmt} for ${bestPotentialSale.scm} ILS${clubNote}${maxNote}`,
      };
    }

    return {
      unitPrice: regularPrice,
      totalPrice: regularTotal,
    };
  }

  /**
   * Update the entire cart with new items and quantities
   */
  private async updateCart(
    items: Record<string, number>
  ): Promise<ShoppingOperationResult<boolean>> {
    try {
      const payload = {
        store: this.store,
        isClub: 0,
        supplyAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        items: Object.fromEntries(
          Object.entries(items).map(([id, quantity]) => [
            id,
            quantity.toString(),
          ])
        ),
        meta: null,
      };

      await this.apiClient.post("/v2/cart", payload);

      // The API typically returns a success response, we assume success if no error
      return this.createSuccessResult(true);
    } catch (error) {
      console.error("[Rami Levy] Cart update error:", error);
      return this.createErrorResult(
        `Failed to update Rami Levy cart: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  constructor(credentials?: WebsiteCredentials) {
    const config: WebsiteConfig = {
      name: "Rami Levy",
      baseUrl: "https://www.rami-levy.co.il/api", // For product operations
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
    this.userApiClient = new ApiClient(
      "https://www-api.rami-levy.co.il/api",
      headers
    );
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

      // TODO: dynamic headers

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
  ): Promise<ShoppingOperationResult<CartItem | string>> {
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
      // Only include available items (not unavailable ones marked with -unavailable)
      const updatedItems = currentCart.items
        .filter(
          (item) => item.id !== cartItemId && !item.id.includes("-unavailable")
        )
        .reduce(
          (acc, item) => {
            // Extract original product ID from our cart item ID
            const productId = item.productId;
            acc[productId] = item.quantity;
            return acc;
          },
          {} as Record<string, number>
        );

      console.log(
        `[Rami Levy] Removing item ${cartItemId}, updated cart:`,
        updatedItems
      );

      // Use the helper method to update the cart
      return await this.updateCart(updatedItems);
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

      // Get current cart to build updated items list
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
      // Only include available items (not unavailable ones marked with -unavailable)
      const updatedItems = currentCart.items
        .filter((item) => !item.id.includes("-unavailable"))
        .reduce(
          (acc, item) => {
            // Extract original product ID from our cart item ID
            const productId = item.productId;
            const newQty = item.id === cartItemId ? quantity : item.quantity;
            acc[productId] = newQty;
            return acc;
          },
          {} as Record<string, number>
        );

      console.log(
        `[Rami Levy] Updating item ${cartItemId} to quantity ${quantity}, updated cart:`,
        updatedItems
      );

      // Use the helper method to update the cart
      const updateResult = await this.updateCart(updatedItems);
      if (!updateResult.success) {
        return this.createErrorResult(
          updateResult.error || "Failed to update cart"
        );
      }

      // Get updated cart to return the updated item details
      const updatedCartResult = await this.getCartContents();
      if (!updatedCartResult.success) {
        return this.createErrorResult("Failed to get updated cart contents");
      }

      const updatedCart = updatedCartResult.data!;

      // Find the updated item
      const updatedItem = updatedCart.items.find(
        (item) => item.id === cartItemId
      );

      if (!updatedItem) {
        return this.createErrorResult(
          "Updated item not found in cart after update"
        );
      }

      return this.createSuccessResult(updatedItem);
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

      // Get user ID from credentials
      const userId =
        this.credentials?.clientId || process.env.RAMI_LEVY_USER_ID || "1";
      if (!userId) {
        return this.createErrorResult(
          "Missing Rami Levy user ID (RAMI_LEVY_USER_ID)"
        );
      }

      // Step 1: Get cart from user data
      const userResponse = await this.userApiClient.get(
        `/v2/site/clubs/customer/${userId}`
      );

      const userCartData = userResponse as RamiLevyUserCartResponse;

      if (!userCartData.cart || !userCartData.cart.items) {
        // Empty cart
        const emptyCart: Cart = {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          currency: "ILS",
        };
        return this.createSuccessResult(emptyCart);
      }

      const cartItems = userCartData.cart.items;
      const productIds = Object.keys(cartItems);

      if (productIds.length === 0) {
        // Empty cart
        const emptyCart: Cart = {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          currency: "ILS",
        };
        return this.createSuccessResult(emptyCart);
      }

      // Step 2: Get product details
      const productsResponse = await this.apiClient.post("/items", {
        ids: productIds.join(","),
        type: "id",
      });

      console.log("productsResponse\n", productsResponse);

      const productsData = productsResponse as RamiLevyProductsResponse;

      if (!productsData.data || !Array.isArray(productsData.data)) {
        return this.createErrorResult(
          "Failed to get product details from cart"
        );
      }

      // Check availability for our store (331)
      const storeId = parseInt(this.store);
      const availableProducts = productsData.data.filter(
        (product) =>
          product.available_in && product.available_in.includes(storeId)
      );
      const unavailableProducts = productsData.data.filter(
        (product) =>
          !product.available_in || !product.available_in.includes(storeId)
      );

      console.log(
        `[Rami Levy] Store ${storeId}: ${availableProducts.length} available, ${unavailableProducts.length} unavailable`
      );

      // Step 3: Combine cart quantities with product details (all products)
      const availableCartItems: CartItem[] = availableProducts.map(
        (product) => {
          const quantity = cartItems[product.id.toString()] || 0;
          const priceInfo = this.calculateBestPrice(product, quantity);

          // Add sale info to product title if applicable
          const productTitle = priceInfo.saleInfo
            ? `${product.gs?.name || product.name} - ${priceInfo.saleInfo}`
            : product.gs?.name || product.name;

          return {
            id: `rami-levy-${product.id}`,
            productId: product.id.toString(),
            productTitle,
            quantity,
            unitPrice: priceInfo.unitPrice,
            totalPrice: priceInfo.totalPrice,
            imageUrl: product.images?.small
              ? `https://www.rami-levy.co.il${product.images.small}`
              : undefined,
          };
        }
      );

      // Add unavailable products with clear indication
      const unavailableCartItems: CartItem[] = unavailableProducts.map(
        (product) => {
          const quantity = cartItems[product.id.toString()] || 0;
          const unitPrice = product.price?.price || 0;

          return {
            id: `rami-levy-${product.id}-unavailable`,
            productId: product.id.toString(),
            productTitle: `❌ ${product.gs?.name || product.name} (Not available in store ${storeId})`,
            quantity,
            unitPrice,
            totalPrice: 0, // Set to 0 since it can't be purchased
            imageUrl: product.images?.small
              ? `https://www.rami-levy.co.il${product.images.small}`
              : undefined,
          };
        }
      );

      // Combine both available and unavailable items
      const cartItemsResult: CartItem[] = [
        ...availableCartItems,
        ...unavailableCartItems,
      ];

      // Calculate totals (only available items count toward price)
      const totalItems = cartItemsResult.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const totalPrice = availableCartItems.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      );

      const cart: Cart = {
        items: cartItemsResult,
        totalItems,
        totalPrice,
        currency: "ILS",
      };

      console.log(
        `[Rami Levy] ✅ Retrieved cart: ${availableCartItems.length} available items (${totalPrice} ILS), ${unavailableCartItems.length} unavailable items`
      );
      return this.createSuccessResult(cart);
    } catch (error) {
      console.error("[Rami Levy] Get cart contents error:", error);
      return this.createErrorResult(
        `Failed to get Rami Levy cart contents: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
