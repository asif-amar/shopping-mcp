// Shopping-specific types and interfaces

export type SupportedWebsite = "rami-levy" | "shufersal"; // | "amazon" | "shopify" - commented out for now

// Product data structures
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  availability: boolean;
  rating?: number;
  reviewCount?: number;
  category?: string;
  brand?: string;
  url?: string;
}

export interface ProductSearchOptions {
  query: string;
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  limit?: number;
}

export interface ProductSearchResult {
  products: Product[];
  totalCount: number;
  hasMore: boolean;
  nextPageToken?: string;
}

// Cart data structures
export interface CartItem {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variant?: string;
  imageUrl?: string;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  currency: string;
}

// API operation results
export interface ShoppingOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  website: SupportedWebsite;
}

// Website configuration
export interface WebsiteConfig {
  name: string;
  baseUrl: string;
  apiVersion?: string;
  rateLimitPerMinute: number;
  requiresAuth: boolean;
  authType?: 'api_key' | 'oauth' | 'basic';
}

// Authentication credentials
export interface WebsiteCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
}

// Request options for API calls
export interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  params?: Record<string, string | number | boolean>;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}