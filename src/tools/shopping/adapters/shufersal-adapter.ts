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

// Add to cart response - Shufersal returns HTML, not JSON
// interface ShufersalAddToCartResponse {
//   success?: boolean;
//   message?: string;
//   error?: string;
//   data?: any;
// }

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
      requiresAuth: true, // Cart operations require auth
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
        } else if (
          priceField &&
          typeof priceField === "object" &&
          typeof priceField.value === "number"
        ) {
          priceNum = priceField.value;
        } else if (
          item.categoryPrice &&
          typeof item.categoryPrice.value === "number"
        ) {
          priceNum = item.categoryPrice.value;
        } else if (
          item.pricePerUnit &&
          typeof item.pricePerUnit.value === "number"
        ) {
          priceNum = item.pricePerUnit.value;
        } else if (typeof item.effectivePrice === "number") {
          priceNum = item.effectivePrice;
        }

        // Determine currency if provided
        const currencyIso =
          (typeof priceField === "object" && priceField?.currencyIso) ||
          item.categoryPrice?.currencyIso ||
          item.pricePerUnit?.currencyIso ||
          "ILS";

        // Availability from stock status
        const availability =
          (item.stock?.stockLevelStatus?.code || "").toLowerCase() ===
          "instock";

        // Prefer API-provided URL if present; otherwise fallback to product path
        const url = item.url
          ? item.url.startsWith("http")
            ? item.url
            : `https://www.shufersal.co.il${item.url}`
          : `https://www.shufersal.co.il/online/he/product/${item.code}`;

        // Choose an image URL with sensible priority
        const imageUrl =
          item.baseProductImageLarge ||
          item.baseProductImageMedium ||
          item.baseProductImageSmall ||
          item.images?.find((i) => (i.format || "").toLowerCase() === "product")
            ?.url ||
          item.images?.find((i) => (i.format || "").toLowerCase() === "large")
            ?.url ||
          (item.images && item.images.length > 0
            ? item.images[0].url
            : undefined);

        const product: Product = {
          id: item.code,
          title: item.name,
          description: item.brandName
            ? `${item.name} - ${item.brandName}`
            : item.name,
          price: priceNum,
          currency: currencyIso,
          availability,
          category: item.secondLevelCategory,
          brand: item.brandName,
          url,
          imageUrl,
          rating:
            typeof item.averageRating === "number"
              ? item.averageRating
              : undefined,
          reviewCount:
            typeof item.numberOfReviews === "number"
              ? item.numberOfReviews
              : undefined,
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

  async addToCart(
    productId: string,
    quantity: number = 1,
    variant?: string
  ): Promise<ShoppingOperationResult<string>> {
    try {
      console.log(
        `[Shufersal] Adding product ${productId} to cart with quantity ${quantity}`
      );

      // Get authentication credentials from adapter credentials or environment fallback
      const csrfToken =
        this.credentials?.apiKey || process.env.SHUFERSAL_CSRF_TOKEN;
      const cookie =
        this.credentials?.accessToken || process.env.SHUFERSAL_COOKIE;

      if (!csrfToken || !cookie) {
        return this.createErrorResult(
          "Missing Shufersal authentication credentials (SHUFERSAL_CSRF_TOKEN or SHUFERSAL_COOKIE)"
        );
      }

      // Prepare the request body as per your example
      const requestBody = {
        productCodePost: productId,
        productCode: productId,
        sellingMethod: "BY_UNIT", // Default selling method
        qty: quantity.toString(),
        frontQuantity: quantity.toString(),
        comment: "",
        affiliateCode: "",
      };

      // Prepare headers with authentication
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Origin: "https://www.shufersal.co.il",
        Referer:
          "https://www.shufersal.co.il/online/he/search?text=%D7%99%D7%95%D7%92%D7%95%D7%A8%D7%98",
        "X-Requested-With": "XMLHttpRequest",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "*/*",
        Cookie: cookie,
        csrftoken: csrfToken,
        Connection: "keep-alive",
      };

      // Create a separate API client for cart operations with proper base URL
      const cartApiClient = new ApiClient(
        "https://www.shufersal.co.il/online/he",
        headers
      );

      // Make the add to cart request - Shufersal returns HTML, not JSON
      const response = await cartApiClient.request<string>({
        method: "POST",
        endpoint: "/cart/add",
        body: requestBody,
        headers,
      });

      // Validate response type
      if (!response || typeof response !== "string") {
        return this.createErrorResult(
          "Invalid response from Shufersal cart API"
        );
      }

      // Console log the first 10 lines
      const responseLines = response.toString().split("\n");
      console.log(
        "[Shufersal] Response preview (first 10 lines):",
        responseLines.slice(0, 10)
      );

      // Convert to string and trim leading whitespace
      const responseHtml = response.toString().trim();

      // Define success prefix
      const successPrefix = "<div class=";

      // Check for success
      const isSuccess = responseHtml.startsWith(successPrefix);

      if (!isSuccess) {
        console.error(
          "[Shufersal] Add to cart failed. Response snippet:",
          responseHtml.slice(0, 300)
        );
        return this.createErrorResult(
          "Product could not be added to cart - possible stock or authentication issue"
        );
      }

      console.log("[Shufersal] ✅ Item successfully added to cart");

      console.log(
        `[Shufersal] Successfully added ${quantity} units of ${productId} to cart`
      );
      
      const message = `Successfully added ${quantity} units of ${productId} to Shufersal cart${variant ? ` (variant: ${variant})` : ''}`;
      return this.createSuccessResult(message);
    } catch (error) {
      console.error("[Shufersal] Add to cart error:", error);
      return this.createErrorResult(
        `Failed to add product to Shufersal cart: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
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
