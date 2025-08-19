import { BaseShoppingAdapter } from "./adapters/base-adapter";
// import { AmazonAdapter } from "./adapters/amazon-adapter"; // Commented out
// import { ShopifyAdapter } from "./adapters/shopify-adapter"; // Commented out
import { RamiLevyAdapter } from "./adapters/rami-levy-adapter";
import { ShufersalAdapter } from "./adapters/shufersal-adapter";
import { SupportedWebsite, WebsiteCredentials } from "./types";

/**
 * Factory class for creating shopping website adapters
 * Handles routing operations to the correct website implementation
 */
export class ShoppingAdapterFactory {
  private static adapters: Map<SupportedWebsite, BaseShoppingAdapter> = new Map();

  /**
   * Get or create an adapter for the specified website
   */
  static getAdapter(website: SupportedWebsite, env?: Env): BaseShoppingAdapter {
    // Check if adapter already exists
    if (this.adapters.has(website)) {
      const adapter = this.adapters.get(website)!;
      return adapter;
    }

    // Create new adapter based on website
    let adapter: BaseShoppingAdapter;

    try {
      switch (website) {
        case "rami-levy":
          adapter = new RamiLevyAdapter(this.getRamiLevyCredentials(env));
          break;

        case "shufersal":
          adapter = new ShufersalAdapter(); // No credentials needed for search-only
          break;

        // case "amazon":
        //   adapter = new AmazonAdapter(this.getAmazonCredentials(env));
        //   break;

        // case "shopify":
        //   adapter = new ShopifyAdapter(this.getShopifyCredentials(env));
        //   break;

        default:
          throw new Error(`Unsupported website: ${website}`);
      }

      // Cache the adapter for reuse
      this.adapters.set(website, adapter);
      return adapter;

    } catch (error) {
      throw new Error(
        `Failed to initialize ${website} adapter: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get list of supported websites
   */
  static getSupportedWebsites(): SupportedWebsite[] {
    return ["rami-levy", "shufersal"]; // "amazon", "shopify" - commented out for now
  }

  /**
   * Check if a website is supported
   */
  static isWebsiteSupported(website: string): website is SupportedWebsite {
    return this.getSupportedWebsites().includes(website as SupportedWebsite);
  }

  /**
   * Clear cached adapters (useful for testing or credential updates)
   */
  static clearCache(): void {
    this.adapters.clear();
  }

  /**
   * Get Rami Levy credentials from environment
   */
  private static getRamiLevyCredentials(env?: Env): WebsiteCredentials | undefined {
    if (!env) return undefined;

    const credentials: WebsiteCredentials = {};
    
    // Check for Rami Levy API credentials in environment variables
    if ((env as any).RAMI_LEVY_API_KEY) {
      credentials.apiKey = (env as any).RAMI_LEVY_API_KEY; // Bearer token
    }
    
    if ((env as any).ECOM_TOKEN) {
      credentials.accessToken = (env as any).ECOM_TOKEN; // ecomtoken header
    }
    
    if ((env as any).COOKIE) {
      credentials.refreshToken = (env as any).COOKIE; // cookie header
    }

    return Object.keys(credentials).length > 0 ? credentials : undefined;
  }

  // /**
  //  * Get Amazon credentials from environment
  //  */
  // private static getAmazonCredentials(env?: Env): WebsiteCredentials | undefined {
  //   if (!env) return undefined;
  //   const credentials: WebsiteCredentials = {};
  //   if ((env as any).AMAZON_API_KEY) {
  //     credentials.apiKey = (env as any).AMAZON_API_KEY;
  //   }
  //   return Object.keys(credentials).length > 0 ? credentials : undefined;
  // }

  // /**
  //  * Get Shopify credentials from environment
  //  */
  // private static getShopifyCredentials(env?: Env): WebsiteCredentials | undefined {
  //   if (!env) return undefined;
  //   const credentials: WebsiteCredentials = {};
  //   if ((env as any).SHOPIFY_ACCESS_TOKEN) {
  //     credentials.accessToken = (env as any).SHOPIFY_ACCESS_TOKEN;
  //   }
  //   return Object.keys(credentials).length > 0 ? credentials : undefined;
  // }

  /**
   * Validate that all required environment variables are set for a website
   */
  static validateWebsiteConfig(website: SupportedWebsite, env?: Env): { isValid: boolean; missingVars: string[] } {
    const missingVars: string[] = [];

    switch (website) {
      case "rami-levy":
        if (!env || !(env as any).RAMI_LEVY_API_KEY) {
          missingVars.push('RAMI_LEVY_API_KEY');
        }
        if (!env || !(env as any).ECOM_TOKEN) {
          missingVars.push('ECOM_TOKEN');
        }
        if (!env || !(env as any).COOKIE) {
          missingVars.push('COOKIE');
        }
        break;

      case "shufersal":
        // No environment variables required for search-only
        break;

      // case "amazon":
      //   if (!env || !(env as any).AMAZON_API_KEY) {
      //     missingVars.push('AMAZON_API_KEY');
      //   }
      //   break;

      // case "shopify":
      //   if (!env || !(env as any).SHOPIFY_ACCESS_TOKEN) {
      //     missingVars.push('SHOPIFY_ACCESS_TOKEN');
      //   }
      //   break;
    }

    return {
      isValid: missingVars.length === 0,
      missingVars,
    };
  }

  /**
   * Get rate limit information for a website
   */
  static getRateLimit(website: SupportedWebsite): number {
    try {
      const adapter = this.adapters.get(website);
      if (adapter) {
        return adapter.getRateLimit();
      }

      // Return default rate limits if adapter not initialized
      switch (website) {
        case "rami-levy":
          return 60;
        case "shufersal":
          return 60;
        // case "amazon":
        //   return 100;
        // case "shopify":
        //   return 80;
        default:
          return 60;
      }
    } catch {
      return 60; // Default fallback
    }
  }
}