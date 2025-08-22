import { SupportedWebsite } from "./types";

/**
 * Security validation utilities for shopping operations
 */
export class ShoppingSecurity {
  
  /**
   * Validate and sanitize product search query
   */
  static validateSearchQuery(query: string): { isValid: boolean; sanitized: string; error?: string } {
    if (!query || typeof query !== 'string') {
      return { isValid: false, sanitized: '', error: 'Search query is required' };
    }

    // Remove dangerous characters and limit length
    const sanitized = query
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/['"]/g, '') // Remove quotes to prevent injection
      .replace(/\\/g, '')   // Remove backslashes
      .trim()
      .slice(0, 200); // Limit to 200 characters

    if (sanitized.length === 0) {
      return { isValid: false, sanitized: '', error: 'Search query cannot be empty after sanitization' };
    }

    if (sanitized.length < 2) {
      return { isValid: false, sanitized, error: 'Search query must be at least 2 characters' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate product ID format
   */
  static validateProductId(productId: string, website: SupportedWebsite): { isValid: boolean; error?: string } {
    if (!productId || typeof productId !== 'string') {
      return { isValid: false, error: 'Product ID is required' };
    }

    const sanitized = productId.trim();

    if (sanitized.length === 0) {
      return { isValid: false, error: 'Product ID cannot be empty' };
    }

    if (sanitized.length > 100) {
      return { isValid: false, error: 'Product ID too long' };
    }

    // Website-specific validation
    switch (website) {
      case "rami-levy":
        // Rami Levy product IDs are typically numeric
        if (!/^\d+$/.test(sanitized)) {
          return { isValid: false, error: 'Invalid Rami Levy product ID format (must be numeric)' };
        }
        break;

      // case "amazon":
      //   // Amazon product IDs (ASIN) are typically alphanumeric, 10 characters
      //   if (!/^[A-Z0-9]{10}$/i.test(sanitized) && !/^amazon-/.test(sanitized)) {
      //     return { isValid: false, error: 'Invalid Amazon product ID format' };
      //   }
      //   break;

      // case "shopify":
      //   // Shopify product IDs are typically numeric or GID format
      //   if (!/^(shopify-gid:\/\/shopify\/Product\/\d+|\d+)$/.test(sanitized)) {
      //     return { isValid: false, error: 'Invalid Shopify product ID format' };
      //   }
      //   break;
    }

    return { isValid: true };
  }

  /**
   * Validate cart item ID
   */
  static validateCartItemId(cartItemId: string): { isValid: boolean; error?: string } {
    if (!cartItemId || typeof cartItemId !== 'string') {
      return { isValid: false, error: 'Cart item ID is required' };
    }

    const sanitized = cartItemId.trim();

    if (sanitized.length === 0) {
      return { isValid: false, error: 'Cart item ID cannot be empty' };
    }

    if (sanitized.length > 100) {
      return { isValid: false, error: 'Cart item ID too long' };
    }

    // Should not contain dangerous characters
    if (/[<>'"\\]/.test(sanitized)) {
      return { isValid: false, error: 'Cart item ID contains invalid characters' };
    }

    return { isValid: true };
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity: number): { isValid: boolean; error?: string } {
    if (typeof quantity !== 'number' || isNaN(quantity)) {
      return { isValid: false, error: 'Quantity must be a number' };
    }

    if (!Number.isInteger(quantity)) {
      return { isValid: false, error: 'Quantity must be a whole number' };
    }

    if (quantity < 0) {
      return { isValid: false, error: 'Quantity cannot be negative' };
    }

    if (quantity > 100) {
      return { isValid: false, error: 'Quantity cannot exceed 100' };
    }

    return { isValid: true };
  }

  /**
   * Validate price range
   */
  static validatePriceRange(priceRange?: { min: number; max: number }): { isValid: boolean; error?: string } {
    if (!priceRange) {
      return { isValid: true }; // Optional parameter
    }

    if (typeof priceRange.min !== 'number' || typeof priceRange.max !== 'number') {
      return { isValid: false, error: 'Price range min and max must be numbers' };
    }

    if (priceRange.min < 0 || priceRange.max < 0) {
      return { isValid: false, error: 'Price range values cannot be negative' };
    }

    if (priceRange.min > priceRange.max) {
      return { isValid: false, error: 'Price range minimum cannot be greater than maximum' };
    }

    if (priceRange.max > 1000000) {
      return { isValid: false, error: 'Price range maximum too high' };
    }

    return { isValid: true };
  }

  /**
   * Validate category filter
   */
  static validateCategory(category?: string): { isValid: boolean; sanitized?: string; error?: string } {
    if (!category) {
      return { isValid: true }; // Optional parameter
    }

    if (typeof category !== 'string') {
      return { isValid: false, error: 'Category must be a string' };
    }

    const sanitized = category
      .replace(/[<>'"\\]/g, '') // Remove dangerous characters
      .trim()
      .slice(0, 100); // Limit length

    if (sanitized.length === 0) {
      return { isValid: false, error: 'Category cannot be empty after sanitization' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate variant specification
   */
  static validateVariant(variant?: string): { isValid: boolean; sanitized?: string; error?: string } {
    if (!variant) {
      return { isValid: true }; // Optional parameter
    }

    if (typeof variant !== 'string') {
      return { isValid: false, error: 'Variant must be a string' };
    }

    const sanitized = variant
      .replace(/[<>'"\\]/g, '') // Remove dangerous characters
      .trim()
      .slice(0, 200); // Limit length

    if (sanitized.length === 0) {
      return { isValid: false, error: 'Variant cannot be empty after sanitization' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Sanitize API response text to prevent XSS
   */
  static sanitizeResponseText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .slice(0, 10000); // Limit length
  }

  /**
   * Format error message for safe display
   */
  static formatSecureError(error: string): string {
    // Remove any potential sensitive information from error messages
    return error
      .replace(/api[_-]?key/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/password/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/credential/gi, '[REDACTED]')
      .slice(0, 500); // Limit length
  }
}