/**
 * Server-side authentication helpers for API routes.
 * Provides verifyAuth() and verifyRole() functions to protect endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'

export interface AuthResult {
  authenticated: boolean
  userId?: string
  role?: string
  tenantId?: string
  error?: string
}

/**
 * Verify the request is authenticated via Bearer token or NextAuth session.
 * Supports both mock tokens (dev) and JWT tokens (production).
 */
export function verifyAuth(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.slice(7)

  // Mock token format: mock_token_{userId}_{timestamp}
  if (token.startsWith('mock_token_')) {
    const parts = token.split('_')
    const userId = parts[2]
    if (!userId) {
      return { authenticated: false, error: 'Invalid mock token' }
    }
    return {
      authenticated: true,
      userId,
      role: 'SUPERADMIN', // Mock tokens default to superadmin for demo
      tenantId: undefined,
    }
  }

  // For production: decode JWT and verify
  // When migrating to real NextAuth, verify the JWT here
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return { authenticated: false, error: 'Token expired' }
    }
    return {
      authenticated: true,
      userId: payload.sub || payload.id,
      role: payload.role,
      tenantId: payload.tenantId,
    }
  } catch {
    return { authenticated: false, error: 'Invalid token format' }
  }
}

/**
 * Verify the request is authenticated AND has one of the allowed roles.
 */
export function verifyRole(request: NextRequest, allowedRoles: string[]): AuthResult {
  const auth = verifyAuth(request)
  if (!auth.authenticated) return auth
  if (auth.role && !allowedRoles.includes(auth.role)) {
    return { authenticated: false, error: `Insufficient permissions. Required: ${allowedRoles.join(', ')}` }
  }
  return auth
}

/**
 * Require authentication — returns 401 if not authenticated.
 * Use at the top of any protected API route handler.
 */
export function requireAuth(request: NextRequest): AuthResult & { userId: string } {
  const auth = verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    throw new AuthError(auth.error || 'Unauthorized', 401)
  }
  return auth as AuthResult & { userId: string }
}

/**
 * Require specific roles — returns 403 if wrong role.
 */
export function requireRole(request: NextRequest, allowedRoles: string[]): AuthResult & { userId: string; role: string } {
  const auth = verifyRole(request, allowedRoles)
  if (!auth.authenticated || !auth.userId) {
    throw new AuthError(auth.error || 'Unauthorized', 401)
  }
  if (!auth.role || !allowedRoles.includes(auth.role)) {
    throw new AuthError('Forbidden: insufficient permissions', 403)
  }
  return auth as AuthResult & { userId: string; role: string }
}

/**
 * Custom error class for auth failures.
 */
export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Check authentication — returns NextResponse(401/403) if auth fails, null if OK.
 * Use at the top of protected API route handlers:
 *   const authErr = checkAuth(request)
 *   if (authErr) return authErr
 */
export function checkAuth(request: NextRequest): NextResponse | null {
  const auth = verifyAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

/**
 * Check authentication + role — returns NextResponse(401/403) if auth/role fails, null if OK.
 * Use at the top of role-protected API route handlers:
 *   const authErr = checkRole(request, ['SUPERADMIN', 'STATION_MANAGER'])
 *   if (authErr) return authErr
 */
export function checkRole(request: NextRequest, allowedRoles: string[]): NextResponse | null {
  const auth = verifyRole(request, allowedRoles)
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

/**
 * Wrap an API handler with authentication check.
 * Usage: `export const GET = withAuth(handler, ['SUPERADMIN', 'STATION_MANAGER'])`
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthResult & { userId: string }) => Promise<NextResponse>,
  roles?: string[]
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const auth = roles ? requireRole(request, roles) : requireAuth(request)
      return await handler(request, auth)
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.statusCode }
        )
      }
      console.error('[Auth middleware error]', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Extract optional authenticated user without blocking the request.
 * Returns null if not authenticated instead of throwing.
 */
export function getOptionalAuth(request: NextRequest): AuthResult | null {
  try {
    return verifyAuth(request)
  } catch {
    return null
  }
}
