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

// Shufersal API response types (based on your example)
interface ShufersalSearchApiResponse {
  results?: ShufersalSearchResultItem[];
}

// Loosely model the response to capture pricing and availability
interface ShufersalSearchResultItem {
  code: string;
  name: string;
  // Some responses include nested price objects
  price?: { value?: number; currencyIso?: string } | number;
  categoryPrice?: { value?: number; currencyIso?: string };
  pricePerUnit?: { value?: number; currencyIso?: string };
  effectivePrice?: number | null;
  unitDescription?: string;
  brandName?: string;
  secondLevelCategory?: string;
  url?: string; // relative url
  stock?: {
    stockLevelStatus?: { code?: string };
  };
  sellingMethod?: { code?: string } | string;
  // Images and media
  images?: Array<{
    imageType?: string;
    format?: string;
    url?: string;
    altText?: string | null;
  }>;
  baseProductImageLarge?: string;
  baseProductImageMedium?: string;
  baseProductImageSmall?: string;
  // Ratings
  averageRating?: number | null;
  numberOfReviews?: number | null;
}

/**
 * Shufersal shopping adapter implementation
 * Integrates with shufersal.co.il search API
 */
export class ShufersalAdapter extends BaseShoppingAdapter {
  private apiClient: ApiClient;

  constructor(credentials?: WebsiteCredentials) {
    console.log("[ShufersalAdapter] Constructor called");

    const config: WebsiteConfig = {
      name: "Shufersal",
      baseUrl: "https://www.shufersal.co.il/online/he",
      apiVersion: "v1",
      rateLimitPerMinute: 60,
      requiresAuth: false, // Search doesn't require auth
    };

    super("shufersal", config, credentials);

    // Initialize API client with headers based on your working example
    const headers: Record<string, string> = {
      accept: "application/json",
      "x-requested-with": "XMLHttpRequest",
      // 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      referer: "https://www.shufersal.co.il/online/he/",
      "referrer-policy": "strict-origin-when-cross-origin",
    };

    this.apiClient = new ApiClient(config.baseUrl, headers);
  }

  async searchProducts(
    options: ProductSearchOptions
  ): Promise<ShoppingOperationResult<ProductSearchResult>> {
    try {
      console.log(`[Shufersal] Searching for: "${options.query}"`);

      // Call Shufersal search API exactly like in your example
      const searchParams = {
        q: options.query,
        limit: "20", // Default search limit
      };

      const response = await this.apiClient.get(
        "/search/results",
        searchParams
      );

      // Parse API response
      const apiResponse = response as ShufersalSearchApiResponse;

      if (!apiResponse?.results) {
        return this.createErrorResult(
          `No results found for query: ${options.query}`
        );
      }

      // Transform Shufersal products to our standard format
      const products: Product[] = apiResponse.results.map((item) => {
        // Determine price from several possible fields
        let priceNum = 0;
        const priceField = item.price as any;
        if (typeof priceField === "number") {
          priceNum = priceField;
        } else if (priceField && typeof priceField === "object" && typeof priceField.value === "number") {
          priceNum = priceField.value;
        } else if (item.categoryPrice && typeof item.categoryPrice.value === "number") {
          priceNum = item.categoryPrice.value;
        } else if (item.pricePerUnit && typeof item.pricePerUnit.value === "number") {
          priceNum = item.pricePerUnit.value;
        } else if (typeof item.effectivePrice === "number") {
          priceNum = item.effectivePrice;
        }

        // Determine currency if provided
        const currencyIso = (typeof priceField === "object" && priceField?.currencyIso)
          || item.categoryPrice?.currencyIso
          || item.pricePerUnit?.currencyIso
          || "ILS";

        // Availability from stock status
        const availability = (item.stock?.stockLevelStatus?.code || "").toLowerCase() === "instock";

        // Prefer API-provided URL if present; otherwise fallback to product path
        const url = item.url
          ? (item.url.startsWith("http")
              ? item.url
              : `https://www.shufersal.co.il${item.url}`)
          : `https://www.shufersal.co.il/online/he/product/${item.code}`;

        // Choose an image URL with sensible priority
        const imageUrl = item.baseProductImageLarge
          || item.baseProductImageMedium
          || item.baseProductImageSmall
          || (item.images?.find(i => (i.format || "").toLowerCase() === "product")?.url)
          || (item.images?.find(i => (i.format || "").toLowerCase() === "large")?.url)
          || (item.images && item.images.length > 0 ? item.images[0].url : undefined);

        const product: Product = {
          id: item.code,
          title: item.name,
          description: item.brandName ? `${item.name} - ${item.brandName}` : item.name,
          price: priceNum,
          currency: currencyIso,
          availability,
          category: item.secondLevelCategory,
          brand: item.brandName,
          url,
          imageUrl,
          rating: typeof item.averageRating === "number" ? item.averageRating : undefined,
          reviewCount: typeof item.numberOfReviews === "number" ? item.numberOfReviews : undefined,
        };

        return this.sanitizeProduct(product);
      });

      // Apply client-side filtering if needed
      let filteredProducts = products;

      if (options.priceRange) {
        filteredProducts = products.filter(
          (product) =>
            product.price >= options.priceRange!.min &&
            product.price <= options.priceRange!.max
        );
      }

      const result: ProductSearchResult = {
        products: filteredProducts,
        totalCount: filteredProducts.length,
        hasMore: apiResponse.results.length >= 20, // Assume more if we got full limit
      };

      return this.createSuccessResult(result);
    } catch (error) {
      console.error("[Shufersal] Search error:", error);
      return this.createErrorResult(
        `Failed to search products on Shufersal: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Cart operations not implemented for Shufersal (search only)
  async addToCart(): Promise<ShoppingOperationResult<CartItem>> {
    return this.createErrorResult(
      "Cart operations not implemented for Shufersal"
    );
  }

  async removeFromCart(): Promise<ShoppingOperationResult<boolean>> {
    return this.createErrorResult(
      "Cart operations not implemented for Shufersal"
    );
  }

  async updateCartQuantity(): Promise<ShoppingOperationResult<CartItem>> {
    return this.createErrorResult(
      "Cart operations not implemented for Shufersal"
    );
  }

  async getCartContents(): Promise<ShoppingOperationResult<Cart>> {
    return this.createErrorResult(
      "Cart operations not implemented for Shufersal"
    );
  }
}
