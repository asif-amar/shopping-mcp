import { ApiRequestOptions } from "../tools/shopping/types";

/**
 * Secure HTTP client for making API requests to shopping websites
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.defaultHeaders = defaultHeaders;
    this.timeout = timeout;
  }

  /**
   * Make a secure HTTP request
   */
  async request<T = any>(options: ApiRequestOptions): Promise<T> {
    const url = `${this.baseUrl}${options.endpoint}`;

    // Validate URL
    this.validateUrl(url);

    // Prepare request configuration
    const config: RequestInit = {
      method: options.method,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      signal: AbortSignal.timeout(options.timeout || this.timeout),
    };

    // Add query parameters for GET requests
    const finalUrl = this.buildUrlWithParams(url, options.params);

    // Add body for non-GET requests
    if (options.method !== "GET" && options.body) {
      config.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(finalUrl, config);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const data = await response.json();

        const sanitized = this.sanitizeResponse(data);

        return sanitized as T;
      } else {
        const text = await response.text();
        return text as T;
      }
    } catch (error) {
      if (error instanceof Error) {
        // Don't expose internal API details in error messages
        if (
          error.message.includes("API key") ||
          error.message.includes("authentication")
        ) {
          throw new Error("Authentication failed");
        }
        if (error.message.includes("timeout")) {
          throw new Error("Request timeout");
        }
        if (error.message.includes("network")) {
          throw new Error("Network error");
        }
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error("Unknown API error occurred");
    }
  }

  /**
   * Validate URL to prevent SSRF attacks
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);

      // Only allow HTTP/HTTPS
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }

      // Block private IP ranges and localhost
      const hostname = parsed.hostname.toLowerCase();

      if (
        hostname === "localhost" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.includes("169.254.") || // Link-local
        hostname.includes("::1") || // IPv6 localhost
        hostname.includes("fc00:") || // IPv6 private
        hostname.includes("fe80:") // IPv6 link-local
      ) {
        throw new Error("Private IP addresses not allowed");
      }
    } catch (error) {
      throw new Error("Invalid URL format");
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrlWithParams(
    url: string,
    params?: Record<string, string | number | boolean>
  ): string {
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const urlObj = new URL(url);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    return urlObj.toString();
  }

  /**
   * Sanitize API response to remove potential security issues
   */
  private sanitizeResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      // Remove potential script tags and limit length
      return data.replace(/<script[^>]*>.*?<\/script>/gi, "").slice(0, 10000);
    }

    if (typeof data === "object") {
      if (Array.isArray(data)) {
        return data.slice(0, 1000).map((item) => this.sanitizeResponse(item));
      } else {
        const sanitized: any = {};
        Object.keys(data)
          .slice(0, 100)
          .forEach((key) => {
            // Sanitize key names
            const cleanKey = String(key).replace(/[<>]/g, "").slice(0, 100);
            sanitized[cleanKey] = this.sanitizeResponse(data[key]);
          });
        return sanitized;
      }
    }

    return data;
  }

  /**
   * Make GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    return this.request<T>({ method: "GET", endpoint, params });
  }

  /**
   * Make POST request
   */
  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>({ method: "POST", endpoint, body });
  }

  /**
   * Make PUT request
   */
  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>({ method: "PUT", endpoint, body });
  }

  /**
   * Make DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>({ method: "DELETE", endpoint });
  }
}
