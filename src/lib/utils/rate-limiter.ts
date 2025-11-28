/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/utils/rate-limiter.ts
 * PURPOSE: Simple in-memory rate limiting for API routes
 * EXPORTS: RateLimiter, createRateLimiter, checkRateLimit
 * 
 * USAGE:
 * - Create a limiter with desired window and max requests
 * - Call checkRateLimit() at the start of API routes
 * - Returns { success: boolean, remaining: number, reset: number }
 * 
 * LIMITATIONS:
 * - In-memory only (resets on server restart)
 * - Per-instance (doesn't share across Vercel functions)
 * - For production at scale, consider Redis-based limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // Unix timestamp when limit resets
}

/**
 * Simple in-memory rate limiter
 * Note: This resets when the server restarts and is per-instance
 * For production at scale, consider using Redis or Upstash
 */
class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private windowMs: number
  private maxRequests: number
  
  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), windowMs)
  }
  
  /**
   * Check if a request should be allowed
   * @param key - Unique identifier (IP, user ID, or combination)
   */
  check(key: string): RateLimitResult {
    const now = Date.now()
    const entry = this.store.get(key)
    
    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: now + this.windowMs
      })
      return {
        success: true,
        remaining: this.maxRequests - 1,
        reset: Math.floor((now + this.windowMs) / 1000)
      }
    }
    
    // Check if under limit
    if (entry.count < this.maxRequests) {
      entry.count++
      return {
        success: true,
        remaining: this.maxRequests - entry.count,
        reset: Math.floor(entry.resetAt / 1000)
      }
    }
    
    // Rate limited
    return {
      success: false,
      remaining: 0,
      reset: Math.floor(entry.resetAt / 1000)
    }
  }
  
  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
      }
    }
  }
}

// Pre-configured limiters for different use cases
// AI endpoints: 10 requests per minute per IP
export const aiRateLimiter = new RateLimiter(60 * 1000, 10)

// Auth endpoints: 5 requests per minute per IP (stricter)
export const authRateLimiter = new RateLimiter(60 * 1000, 5)

// General API: 60 requests per minute per IP
export const apiRateLimiter = new RateLimiter(60 * 1000, 60)

/**
 * Helper to extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Try various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Vercel-specific header
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0].trim()
  }
  
  // Fallback
  return 'unknown'
}

/**
 * Check rate limit and return appropriate response if exceeded
 * @returns null if allowed, Response if rate limited
 */
export function checkRateLimit(
  request: Request,
  limiter: RateLimiter
): { allowed: boolean; response?: Response; result: RateLimitResult } {
  const ip = getClientIP(request)
  const result = limiter.check(ip)
  
  if (!result.success) {
    const response = new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.reset - Math.floor(Date.now() / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': (result.reset - Math.floor(Date.now() / 1000)).toString()
        }
      }
    )
    return { allowed: false, response, result }
  }
  
  return { allowed: true, result }
}

/**
 * Create rate limit headers for successful responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString()
  }
}
