import {
  Product,
  ProductSearchOptions,
  ProductSearchResult,
  CartItem,
  Cart,
  ShoppingOperationResult,
  SupportedWebsite,
  WebsiteConfig,
  WebsiteCredentials,
} from "../types";

/**
 * Abstract base class for shopping website adapters
 * Each website implementation must extend this class
 */
export abstract class BaseShoppingAdapter {
  protected website: SupportedWebsite;
  protected config: WebsiteConfig;
  protected credentials?: WebsiteCredentials;

  constructor(
    website: SupportedWebsite,
    config: WebsiteConfig,
    credentials?: WebsiteCredentials
  ) {
    this.website = website;
    this.config = config;
    this.credentials = credentials;
  }

  /**
   * Search for products on the website
   */
  abstract searchProducts(
    options: ProductSearchOptions
  ): Promise<ShoppingOperationResult<ProductSearchResult>>;

  /**
   * Add a product to the shopping cart
   */
  abstract addToCart(
    productId: string,
    quantity: number,
    variant?: string
  ): Promise<ShoppingOperationResult<CartItem | string>>;

  /**
   * Remove an item from the shopping cart
   */
  abstract removeFromCart(
    cartItemId: string
  ): Promise<ShoppingOperationResult<boolean>>;

  /**
   * Update quantity of an item in the cart
   */
  abstract updateCartQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<ShoppingOperationResult<CartItem>>;

  /**
   * Get current cart contents
   */
  abstract getCartContents(): Promise<ShoppingOperationResult<Cart>>;

  /**
   * Validate that the adapter is properly configured
   */
  protected validateConfig(): boolean {
    if (!this.config) {
      return false;
    }

    if (this.config.requiresAuth && !this.credentials) {
      return false;
    }

    return true;
  }

  /**
   * Get website name for identification
   */
  getWebsiteName(): SupportedWebsite {
    return this.website;
  }

  /**
   * Get rate limit information
   */
  getRateLimit(): number {
    return this.config.rateLimitPerMinute;
  }

  /**
   * Create standardized error result
   */
  protected createErrorResult<T>(error: string): ShoppingOperationResult<T> {
    return {
      success: false,
      error,
      website: this.website,
    };
  }

  /**
   * Create standardized success result
   */
  protected createSuccessResult<T>(data: T): ShoppingOperationResult<T> {
    return {
      success: true,
      data,
      website: this.website,
    };
  }

  /**
   * Sanitize product data to remove potential security issues
   */
  protected sanitizeProduct(product: any): Product {
    return {
      id: String(product.id || '').replace(/[<>]/g, ''),
      title: String(product.title || '').replace(/[<>]/g, '').slice(0, 200),
      description: String(product.description || '').replace(/[<>]/g, '').slice(0, 1000),
      price: Number(product.price) || 0,
      currency: String(product.currency || 'USD').slice(0, 3),
      imageUrl: this.sanitizeUrl(product.imageUrl),
      availability: Boolean(product.availability),
      rating: product.rating ? Math.min(Math.max(Number(product.rating), 0), 5) : undefined,
      reviewCount: product.reviewCount ? Math.max(Number(product.reviewCount), 0) : undefined,
      category: product.category ? String(product.category).replace(/[<>]/g, '').slice(0, 100) : undefined,
      brand: product.brand ? String(product.brand).replace(/[<>]/g, '').slice(0, 100) : undefined,
      url: this.sanitizeUrl(product.url),
    };
  }

  /**
   * Sanitize URLs to prevent injection attacks
   */
  private sanitizeUrl(url?: string): string | undefined {
    if (!url) return undefined;
    
    try {
      const parsed = new URL(url);
      // Only allow http/https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return undefined;
      }
      return parsed.toString();
    } catch {
      return undefined;
    }
  }
}